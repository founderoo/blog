import cloudinary from '../../lib/cloudinary'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { image, folder = 'blog-posts' } = req.body

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: folder,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto:best' },
        { format: 'auto' }
      ]
    })

    res.status(200).json({ 
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id 
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
  }
}
