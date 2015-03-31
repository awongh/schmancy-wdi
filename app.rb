require 'sinatra'
require 'sinatra/activerecord'
require './environments'

require 'rack/contrib'

require 'digest/md5'
require 'warden'

if development?
  require 'pry-byebug'
  require "sinatra/reloader"
end

set :root, File.dirname(__FILE__)
set :views, Proc.new { File.join(root, "views") }

get '/' do
  redirect '/login' unless env['warden'].user
  send_file(settings.views + '/index.html')
end

get '/myfavorites' do
  redirect '/login' unless env['warden'].user
  @favorites = Favorite.where( user_id: env['warden'].user.id )
  erb :favorites
end

get '/favorites' do
  status 403 unless env['warden'].user
  content_type :json
  Favorite.where( user_id: env['warden'].user.id ).to_json
end

post '/favorites' do
  status 403 unless env['warden'].user

  content_type :json

  #this is some weird JS xhr request/rack thing.
  #http://stackoverflow.com/questions/17049569/how-to-parse-json-request-body-in-sinatra-just-once-and-expose-it-to-all-routes
  request.body.rewind
  params = JSON.parse request.body.read

  if( Favorite.where( user_id: env['warden'].user.id, imdbid: params['imdbid'] ).empty? )
    Favorite.create(
      user_id: env['warden'].user.id,
      title: params['title'],
      imdbid: params['imdbid']
    )
  end
end

class Favorite < ActiveRecord::Base
end

#auth stuff
#mostly cribbed from here: https://gist.github.com/regedarek/1695546

class User < ActiveRecord::Base

  def self.authenticate(username, password)
    user = self.find_by_username(username)
    user if user && ::Digest::MD5.hexdigest(::Digest::MD5.hexdigest(password)) == user.password
  end
end

# Rack Setup
use Rack::Session::Cookie, :secret => "blabla"

use Warden::Manager do |m|
  m.default_strategies :password
  m.failure_app = FailureApp.new
end

# Warden Strategies

Warden::Strategies.add(:password) do
  def valid?
    puts '[INFO] password strategy valid?'
    params['username'] || params['password']
  end

  def authenticate!
    puts '[INFO] password strategy authenticate'
    u = User.authenticate(params['username'], params['password'])
    u.nil? ? fail!('Could not login in') : success!(u)
  end
end

###
class FailureApp
  def call(env)
    uri = env['REQUEST_URI']
    puts "failure #{env['REQUEST_METHOD']} #{uri}"
  end
end

get '/login/?' do
  if env['warden'].authenticate
    redirect '/'
  else
    File.read(settings.views + '/login.html')
  end
end

get '/logout/?' do
  env['warden'].logout
  redirect '/login'
end

post '/login/?' do
  if env['warden'].authenticate
    redirect '/'
  else
    redirect '/login'
  end
end

post '/signup/?' do
  if( User.where( username: params['username'] ).emtpy? )
    User.create(
      username: params['username'],
      password: ::Digest::MD5.hexdigest(::Digest::MD5.hexdigest(params['password']))
    )
  end

  #log them in
  #silently log them in if they are trying to sign up, but exist
  if env['warden'].authenticate
    redirect '/'
  else
    redirect '/login'
  end
end

get '/logout/?' do
  env['warden'].logout
  redirect '/'
end
