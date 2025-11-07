// ============================================
// FRONTEND: components/MediaUpload.tsx
// ============================================
import React, {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'

export interface MediaUploadHandle {
  openFileDialog: (type?: 'image' | 'video' | 'audio' | 'any') => void
}

interface MediaUploadProps {
  onMediaUploaded: (url: string) => void
  onMediaRemoved: () => void
  userId: string
  className?: string
}

export interface UploadedMedia {
  url: string
  type: string
  name: string
}

const MediaUpload = forwardRef<MediaUploadHandle, MediaUploadProps>(
  ({ onMediaUploaded, onMediaRemoved, userId, className = '' }, ref) => {
    const [acceptType, setAcceptType] = useState<'image' | 'video' | 'audio' | 'any'>('any')
    const [inputKey, setInputKey] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<string>('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      openFileDialog: (type = 'any') => {
        setAcceptType(type)
        setInputKey((prev) => prev + 1) 
        setTimeout(() => {
          fileInputRef.current?.click()
        }, 0)
      },
    }))

    const getAcceptMime = () => {
      switch (acceptType) {
        case 'image':
          return 'image/*'
        case 'video':
          return 'video/*'
        case 'audio':
          return 'audio/*'
        default:
          return '*/*'
      }
    }

    const validateFile = (file: File): { isValid: boolean; error?: string } => {
      const maxSize = 100 * 1024 * 1024 // 100MB
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg', 'video/avi',
        'video/mkv', 'video/flv', 'video/wmv', 'video/m4v',
        'video/3gp', 'video/ts', 'video/mts', 'video/m2ts',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac',
        'audio/flac', 'audio/wma', 'audio/opus', 'audio/aiff', 'audio/pcm',
      ]

      if (file.size > maxSize) {
        return { isValid: false, error: 'File size must be less than 100MB' }
      }

      if (!allowedTypes.includes(file.type)) {
        return { isValid: false, error: 'File type not supported' }
      }

      return { isValid: true }
    }

    // Compress image to target size (e.g., 50KB)
    const compressImageToTargetSize = async (
      file: File,
      targetSizeKB = 50,
      maxWidth = 1920,
      maxHeight = 1080
    ): Promise<File> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)

        reader.onload = async (e) => {
          const img = new Image()
          img.src = e.target?.result as string

          img.onload = async () => {
            const canvas = document.createElement('canvas')
            let width = img.width
            let height = img.height

            // Calculate new dimensions while maintaining aspect ratio
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }

            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            if (!ctx) {
              reject(new Error('Failed to get canvas context'))
              return
            }

            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, width, height)

            // Iteratively compress to target size
            const targetSizeBytes = targetSizeKB * 1024
            let quality = 0.9
            let blob: Blob | null = null
            let attempts = 0
            const maxAttempts = 10

            while (attempts < maxAttempts) {
              blob = await new Promise<Blob | null>((resolveBlob) => {
                canvas.toBlob(resolveBlob, 'image/jpeg', quality)
              })

              if (!blob) {
                reject(new Error('Compression failed'))
                return
              }

              console.log(`Attempt ${attempts + 1}: Size=${(blob.size / 1024).toFixed(2)}KB, Quality=${quality.toFixed(2)}`)

              // If we're within 10% of target or below target, we're done
              if (blob.size <= targetSizeBytes || blob.size <= targetSizeBytes * 1.1) {
                break
              }

              // If still too large, reduce quality more aggressively
              const ratio = targetSizeBytes / blob.size
              quality *= Math.max(ratio * 0.9, 0.5) // Reduce quality but not below 50% of current
              quality = Math.max(quality, 0.1) // Never go below 0.1
              
              attempts++
            }

            if (!blob) {
              reject(new Error('Compression failed'))
              return
            }

            // If still larger than target after max attempts, reduce dimensions
            if (blob.size > targetSizeBytes && attempts >= maxAttempts) {
              console.log('Still too large, reducing dimensions...')
              
              // Reduce dimensions by 70%
              canvas.width = Math.round(width * 0.7)
              canvas.height = Math.round(height * 0.7)
              
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              
              // Try one more time with lower quality
              blob = await new Promise<Blob | null>((resolveBlob) => {
                canvas.toBlob(resolveBlob, 'image/jpeg', 0.5)
              })
            }

            if (!blob) {
              reject(new Error('Compression failed'))
              return
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })

            console.log('✅ Final compression stats:', {
              original: `${(file.size / 1024).toFixed(2)} KB`,
              compressed: `${(compressedFile.size / 1024).toFixed(2)} KB`,
              target: `${targetSizeKB} KB`,
              reduction: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`,
              finalDimensions: `${canvas.width}x${canvas.height}`,
            })

            resolve(compressedFile)
          }

          img.onerror = () => reject(new Error('Failed to load image'))
        }

        reader.onerror = () => reject(new Error('Failed to read file'))
      })
    }

    // Simple compression (for backward compatibility)
    const compressImage = (
      file: File, 
      maxWidth = 1920, 
      maxHeight = 1080, 
      quality = 0.8
    ): Promise<File> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)

        reader.onload = (e) => {
          const img = new Image()
          img.src = e.target?.result as string

          img.onload = () => {
            const canvas = document.createElement('canvas')
            let width = img.width
            let height = img.height

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }

            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            if (!ctx) {
              reject(new Error('Failed to get canvas context'))
              return
            }

            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Compression failed'))
                  return
                }

                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })

                resolve(compressedFile)
              },
              'image/jpeg',
              quality
            )
          }

          img.onerror = () => reject(new Error('Failed to load image'))
        }

        reader.onerror = () => reject(new Error('Failed to read file'))
      })
    }

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file || !userId) return

      const validation = validateFile(file)
      if (!validation.isValid) {
        alert(validation.error || 'Invalid file')
        return
      }

      setIsUploading(true)
      setUploadProgress('Preparing file...')

      try {
        let fileToUpload = file

        // Compress if it's an image
        const isImage = file.type.startsWith('image/')
        if (isImage) {
          setUploadProgress('Compressing image...')
          try {
            // Choose compression method based on original file size
            if (file.size > 500 * 1024) { // If larger than 500KB
              // Compress to 50KB target
              fileToUpload = await compressImageToTargetSize(file, 50)
            } else if (file.size > 100 * 1024) { // If larger than 100KB
              // Compress to 50KB target
              fileToUpload = await compressImageToTargetSize(file, 50)
            } else {
              // Already small, just optimize quality
              fileToUpload = await compressImage(file, 1920, 1080, 0.8)
            }
          } catch (compressionError) {
            console.warn('Image compression failed, uploading original:', compressionError)
            // Continue with original file if compression fails
          }
        }

        setUploadProgress('Uploading...')

        const formData = new FormData()
        formData.append('file', fileToUpload)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          let errorMessage = 'Upload failed'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || 'Upload failed'
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError)
            if (response.status === 413) {
              errorMessage = 'File too large. Please try a smaller file.'
            } else if (response.status === 408) {
              errorMessage = 'Upload timeout. Please try again.'
            } else if (response.status >= 500) {
              errorMessage = 'Server error. Please try again later.'
            }
          }
          throw new Error(errorMessage)
        }

        const result = await response.json()
        
        setUploadProgress('Upload complete!')
        onMediaUploaded(result.url)
      } catch (error) {
        console.error('Failed to upload file:', error)
        alert(error instanceof Error ? error.message : 'Failed to upload file. Please try again.')
      } finally {
        setTimeout(() => {
          setIsUploading(false)
          setUploadProgress('')
        }, 500)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }

    return (
      <div className={className}>
        <input
          key={inputKey}
          ref={fileInputRef}
          type="file"
          accept={getAcceptMime()}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        {isUploading && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700/50 rounded-2xl p-8 text-center shadow-2xl max-w-sm mx-4">
              {/* Animated upload icon */}
              <div className="relative mb-6">
                <div className="w-20 h-20 mx-auto relative">
                  {/* Outer rotating ring */}
                  <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-purple-500 border-r-blue-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>

                  {/* Inner pulsing circle */}
                  <div className="absolute inset-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Upload text */}
              <div className="space-y-2">
                <h3 className="text-white font-semibold text-lg">
                  {uploadProgress || 'Uploading Media'}
                </h3>
                <p className="text-gray-400 text-sm">Please wait while we process your file...</p>

                {/* Animated dots */}
                <div className="flex justify-center gap-1 mt-4">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

MediaUpload.displayName = 'MediaUpload'

export default MediaUpload