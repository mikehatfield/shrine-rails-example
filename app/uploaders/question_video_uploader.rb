# This is a subclass of Shrine base that will be further configured for it's requirements.
# This will be included in the model to manage the file.

require "streamio-ffmpeg"
require "tempfile"

class QuestionVideoUploader < Shrine
    ALLOWED_TYPES       = %w[video/mp4 video/quicktime video/webm video/avi video/mpeg video/x-mpeg video/m4v video/x-m4v video/msvideo video/x-msvideo]
    ALLOWED_EXTENSIONS  = %w[mp4 mov avi mpeg mpg m4v webm wmv]
    MAX_SIZE            = 200*1024*1024 # 200 MB
  plugin :add_metadata
  plugin :processing
  plugin :versions
  plugin :delete_raw
  plugin :entity
  plugin :validation_helpers

# This creates screenshots 
#   add_metadata do |io, context|
#     movie = Shrine.with_file(io) { |file| FFMPEG::Movie.new(file.path) }
#     { "duration"   => movie.duration,
#       "bitrate"    => movie.bitrate,
#       "resolution" => movie.resolution,
#       "frame_rate" => movie.frame_rate
#     }

#   end

#   process(:store) do |io, context|
#     versions = {original: io}

#     io.download do |original|
#       screenshot1 = Tempfile.new(["screenshot1", ".jpg"], binmode: true)
#       screenshot2 = Tempfile.new(["screenshot2", ".jpg"], binmode: true)

#       movie = FFMPEG::Movie.new(original.path)
#       movie.screenshot(screenshot1.path, seek_time: 0, resolution: '640x480')
#       movie.screenshot(screenshot2.path, seek_time: 1, resolution: '640x480')

#       [screenshot1, screenshot2].each(&:open) # refresh file descriptors

#       versions.merge!(screenshot1: screenshot1, screenshot2: screenshot2)
#     end

#     versions
#   end

  Attacher.validate do
    validate_max_size MAX_SIZE, message: "is too large (max is 200 MB)"
    validate_mime_type_inclusion ALLOWED_TYPES
    validate_extension_inclusion ALLOWED_EXTENSIONS
  end
end