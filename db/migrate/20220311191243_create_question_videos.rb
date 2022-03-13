class CreateQuestionVideos < ActiveRecord::Migration[6.1]
  def change
    create_table :question_videos do |t|
      t.references :album, null: false, foreign_key: true
      t.text :video_data

      t.timestamps
    end
  end
end
