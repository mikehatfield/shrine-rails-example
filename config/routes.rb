Rails.application.routes.draw do
  root to: "albums#index"

  resources :albums

  case Rails.configuration.upload_server
  when :s3
    # By default in production we use s3, including upload directly to S3 with
    # signed url.

     # uncomment to protect upload endpoints with devise
    #authenticate :user do
      mount Shrine.presign_endpoint(:cache) => "/s3/params"
    #end
  when :s3_multipart
    # Still upload directly to S3, but using Uppy's AwsS3Multipart plugin

    # uncomment to protect upload endpoints with devise
    #authenticate :user do
      mount Shrine.uppy_s3_multipart(:cache) => "/s3/multipart"
    #end
  when :app
    # In development and test environment by default we're using filesystem storage
    # for speed, so on the client side we'll upload files to our app.
    
    # uncomment to protect upload endpoints with devise
    #authenticate :user do
      mount Shrine.upload_endpoint(:cache) => "/upload"
    #end
  end

  mount ImageUploader.derivation_endpoint => "/derivations/image"
end
