require 'sinatra'
require 'sinatra/activerecord'
require './environments'

require 'digest/md5'
require 'warden'
#require 'rack/flash'

require 'pry-byebug'
require "sinatra/reloader" if development?


set :root, File.dirname(__FILE__)
set :views, Proc.new { File.join(root, "views") }

get '/' do
  redirect '/login' unless env['warden'].user
  File.read(settings.views + '/index.html')
end

get 'favorites' do
  response.header['Content-Type'] = 'application/json'
  File.read('data.json')
end

get '/favorites' do
  file = JSON.parse(File.read('data.json'))
  unless params[:name] && params[:oid]
    return 'Invalid Request'
  end
  movie = { name: params[:name], oid: params[:oid] }
  file << movie
  File.write('data.json',JSON.pretty_generate(file))
  movie.to_json
end

class Post < ActiveRecord::Base
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

post '/login/?' do
  if env['warden'].authenticate
    redirect '/'
  else
    redirect '/login'
  end
end

post '/signup/?' do

  User.create(
    username: params['username'],
    password: ::Digest::MD5.hexdigest(::Digest::MD5.hexdigest(params['password']))
  )

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
