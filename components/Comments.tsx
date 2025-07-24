"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { doc as firestoreDoc, getDoc as firestoreGetDoc } from "firebase/firestore";
import { MessageCircle, ArrowUp, Reply, Edit, Send } from "lucide-react";
import UserAvatar from "./UserAvatar";

interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: any;
  updatedAt?: any;
  likes: number;
  likedBy: string[];
  replies?: Comment[];
  parentId?: string;
}

interface CommentsProps {
  postId: string;
  commentsCount: number;
  onCommentsCountChange: (count: number) => void;
}

export default function Comments({
  postId,
  commentsCount,
  onCommentsCountChange,
}: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const { user, isFirebaseConfigured } = useAuth();

  useEffect(() => {
    if (isFirebaseConfigured && db) {
      fetchComments();
    } else {
      // Demo mode - show some mock comments
      setComments([
        {
          id: "demo1",
          postId,
          userId: "demo-user1",
          userName: "Demo User",
          content:
            "This is a demo comment. Firebase is not configured, so comments won't persist.",
          createdAt: new Date(),
          likes: 3,
          likedBy: [],
          replies: [],
        },
      ]);
      setLoading(false);
    }
  }, [postId, isFirebaseConfigured]);

  const fetchComments = async () => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const commentsQuery = query(
        collection(db, "comments"),
        where("postId", "==", postId),
        where("parentId", "==", null),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(commentsQuery);
      const commentsData = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const comment = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          } as Comment;

          // Fetch replies for this comment
          const repliesQuery = query(
            collection(db, "comments"),
            where("parentId", "==", comment.id),
            orderBy("createdAt", "asc")
          );
          const repliesSnapshot = await getDocs(repliesQuery);
          comment.replies = repliesSnapshot.docs.map((replyDoc) => ({
            id: replyDoc.id,
            ...replyDoc.data(),
          })) as Comment[];

          return comment;
        })
      );

      setComments(commentsData);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    if (!isFirebaseConfigured || !db) {
      alert("Firebase is not configured. Comments won't persist in demo mode.");
      return;
    }

    setSubmitting(true);
    try {
      // Get user profile from Firestore to get the updated photoURL
      let userAvatar = user.photoURL;
      try {
        const userProfileDoc = await firestoreGetDoc(firestoreDoc(db, "users", user.uid));
        if (userProfileDoc.exists()) {
          const profileData = userProfileDoc.data();
          userAvatar = profileData.photoURL || user.photoURL;
        }
      } catch (error) {
        console.log("Could not fetch user profile, using default avatar");
      }

      const commentData = {
        postId,
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
        userAvatar: userAvatar || null,
        content: newComment.trim(),
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        parentId: null,
      };

      await addDoc(collection(db, "comments"), commentData);

      // Update post comments count
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        comments: increment(1),
      });

      setNewComment("");
      onCommentsCountChange(commentsCount + 1);
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return;

    if (!isFirebaseConfigured || !db) {
      alert("Firebase is not configured. Replies won't persist in demo mode.");
      return;
    }

    setSubmitting(true);
    try {
      // Get user profile from Firestore to get the updated photoURL
      let userAvatar = user.photoURL;
      try {
        const userProfileDoc = await firestoreGetDoc(firestoreDoc(db, "users", user.uid));
        if (userProfileDoc.exists()) {
          const profileData = userProfileDoc.data();
          userAvatar = profileData.photoURL || user.photoURL;
        }
      } catch (error) {
        console.log("Could not fetch user profile, using default avatar");
      }

      const replyData = {
        postId,
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Anonymous",
        userAvatar: userAvatar || null,
        content: replyContent.trim(),
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        parentId,
      };

      await addDoc(collection(db, "comments"), replyData);

      // Update post comments count
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        comments: increment(1),
      });

      setReplyContent("");
      setReplyTo(null);
      onCommentsCountChange(commentsCount + 1);
      fetchComments();
    } catch (error) {
      console.error("Error adding reply:", error);
      alert("Failed to add reply. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      alert("Please log in to like comments");
      return;
    }

    if (!isFirebaseConfigured || !db) {
      alert("Firebase is not configured. Likes won't persist in demo mode.");
      return;
    }

    const comment = findCommentById(commentId);
    if (!comment) return;

    const isLiked = comment.likedBy.includes(user.uid);
    const commentRef = doc(db, "comments", commentId);

    try {
      if (isLiked) {
        await updateDoc(commentRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid),
        });
      } else {
        await updateDoc(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid),
        });
      }

      fetchComments();
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!user || !editContent.trim()) return;

    if (!isFirebaseConfigured || !db) {
      alert("Firebase is not configured. Edits won't persist in demo mode.");
      return;
    }

    try {
      const commentRef = doc(db, "comments", commentId);
      await updateDoc(commentRef, {
        content: editContent.trim(),
        updatedAt: serverTimestamp(),
      });

      setEditingComment(null);
      setEditContent("");
      fetchComments();
    } catch (error) {
      console.error("Error editing comment:", error);
    }
  };

  const findCommentById = (id: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      if (comment.replies) {
        const reply = comment.replies.find((r) => r.id === id);
        if (reply) return reply;
      }
    }
    return null;
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const CommentComponent = ({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) => (
    <div
      className={`${
        isReply
          ? "ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4"
          : ""
      }`}
    >
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          {comment.userAvatar ? (
            <img
              src={comment.userAvatar}
              alt={comment.userName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xs font-medium text-purple-600 dark:text-purple-300">
              {getInitials(comment.userName)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {comment.userName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(comment.createdAt)}
            </span>
            {comment.updatedAt && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                (edited)
              </span>
            )}
          </div>

          {editingComment === comment.id ? (
            <div className="mb-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm resize-none"
                rows={3}
                placeholder="Edit your comment..."
              />
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent("");
                  }}
                  className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-800 dark:text-gray-200 mb-2 leading-relaxed">
              {comment.content}
            </p>
          )}

          <div className="flex items-center space-x-4 text-xs">
            <button
              onClick={() => handleLikeComment(comment.id)}
              className={`flex items-center space-x-1 hover:text-purple-600 transition-colors ${
                user && comment.likedBy.includes(user.uid)
                  ? "text-purple-600"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <ArrowUp className="h-3 w-3" />
              <span>{comment.likes}</span>
            </button>

            {!isReply && (
              <button
                onClick={() =>
                  setReplyTo(replyTo === comment.id ? null : comment.id)
                }
                className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-purple-600 transition-colors"
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
              </button>
            )}

            {user && user.uid === comment.userId && (
              <button
                onClick={() => {
                  if (editingComment === comment.id) {
                    setEditingComment(null);
                    setEditContent("");
                  } else {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }
                }}
                className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-purple-600 transition-colors"
              >
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {replyTo === comment.id && (
            <div className="mt-3 ml-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitReply(comment.id);
                }}
              >
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm resize-none"
                  rows={3}
                  placeholder={`Reply to ${comment.userName}...`}
                  required
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(null);
                      setReplyContent("");
                    }}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !replyContent.trim()}
                    className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    <span>{submitting ? "Posting..." : "Reply"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentComponent
                  key={reply.id}
                  comment={reply}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-8 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <MessageCircle className="h-5 w-5 mr-2" />
          Comments ({commentsCount})
        </h3>

        {!isFirebaseConfigured && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Demo Mode:</strong> Comments functionality is limited.
              Configure Firebase to enable full features.
            </p>
          </div>
        )}

        {user ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                <UserAvatar user={user} size={32} />
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Share your thoughts..."
                  required
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? "Posting..." : "Post Comment"}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to post comments and join the discussion.
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <p className="text-sm text-gray-500 mt-2">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentComponent key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
