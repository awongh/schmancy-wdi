class CreateFavorites < ActiveRecord::Migration
  def change
    create_table :favorites do |t|
      t.string :imdbid
      t.timestamps null: false
    end

    create_table :users do |t|
      t.string :username
      t.string :password
      t.timestamps null: false
    end
  end
end
