class Album < ActiveRecord::Base
  #has_many :photos, dependent: :destroy
  has_many :question_videos, dependent: :destroy
  #accepts_nested_attributes_for :photos, allow_destroy: true
  accepts_nested_attributes_for :question_videos, allow_destroy: true

  #include ImageUploader::Attachment(:cover_photo)  # ImageUploader will attach and manage `cover_photo`
  #include QuestionVideoUploader::Attachment(:video)

  #validates_presence_of :name, :cover_photo  # Normal model validations - optional
  validates_presence_of :name
end
