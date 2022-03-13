class QuestionVideo < ActiveRecord::Base
    include QuestionVideoUploader::Attachment(:video)  # QuestionVideoUploader will attach and manage `video`
  
    validates_presence_of :video
  end
  