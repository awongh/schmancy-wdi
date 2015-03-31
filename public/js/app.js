(function(){
  var user_favorites = [];

  //from: http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
  var isFunction = function(x) {
    return Object.prototype.toString.call(x) == '[object Function]';
  }

  var has_favorite = function( id ){
    for( var i = 0; i < user_favorites.length; i++ ){
      if( user_favorites[i]['imdbid'] == id ){
        return true;
      }
    }

    return false;
  }

  var get_favorites = function( callback ){
    request_ajax('/favorites', 'get', "",  function(response){
      user_favorites = JSON.parse( this.response );

      if ( isFunction(callback) ){
        callback();
      }
    });
  };

  var set_favorite = function( el ){
    imdbid = el.parentElement.dataset.imdbid;
    title = el.parentElement.dataset.title;
    el.parentElement.removeChild( el );
    request_ajax('/favorites', 'post', {imdbid: imdbid, title:title},  function(response){
      if( response.currentTarget.status != 200 ){
        alert("couldn't save favorite.");
      }else{
        //inefficient but easy
        get_favorites( function(){});
      }
    });
  };

  var render_detail = function( response ){
    var res = JSON.parse( response.currentTarget.response );
    var node = document.getElementById("template-detail").cloneNode(true);

    node.id = "";

    for(var key in res){
      if (res.hasOwnProperty(key)) {

        if( key == "Response" ) continue;

        if( key == "Poster" ){
          node.querySelector(".poster-img").setAttribute('src', res[key])
        }else{
          node.querySelector("."+key.toLowerCase()).innerHTML = node.querySelector("."+key.toLowerCase()).innerHTML + res[key];
        }
      }
    }

    document.getElementById(res.imdbID).querySelector('.detail-container').appendChild(node);
  };

  //we should use this normally, but here we are using JSON stringify b/c sinatra can't see what you send otherwise.
  var post_serialize = function( post_object ) {

    var return_string = "";

    for(var key in post_object ){

      if (post_object.hasOwnProperty(key)) {
        return_string += key + "=" + post_object[key]
      }

    }

    return return_string;
  };

  var request_ajax = function( url_request, method, params,callback ){

    if( method == 'get' ){
      url_request = url_request + params;
    }

    var xhr = new XMLHttpRequest();
    xhr.open(method, url_request, true);
    xhr.addEventListener('load', callback)

    if( method == 'post' ){
      xhr.send( JSON.stringify( params ) );
    }else{
      xhr.send();
    }
  };

  var request_omdb = function( url_request, url_arguments, callback ){
    var params = url_request + "=" + url_arguments;
    request_ajax('http://omdbapi.com/?', 'get', params, callback);
  };

  var request_omdb_search = function( url_arguments, callback ) {
    request_omdb( "s", url_arguments, callback );
  };

  var request_omdb_detail = function( id, callback ) {
    request_omdb( "i", id, callback );
  };

  var omdb_detail = function( el ){
    if( el.parentElement.dataset.clicked == 'false' ){
      el.parentElement.setAttribute( 'data-clicked', 'true' );
      request_omdb_detail( el.parentElement.dataset.imdbid, render_detail );
    }else if( el.parentElement.dataset.clicked == 'true' ){
      if( el.parentElement.querySelector('.detail-container').style.display == "none" ){

        el.parentElement.querySelector('.detail-container').style.display = "block";
      }else{
        el.parentElement.querySelector('.detail-container').style.display = "none";
      }
    }

  };

  document.querySelector('form').addEventListener('submit', function(event){
    event.preventDefault();

    var input = document.querySelector('input').value;

    request_omdb_search( encodeURIComponent(input) , function(response){

      var res =  JSON.parse(this.response).Search;

      for(var i = 0; i < res.length; i++){

        var node = document.getElementById("template-search-result").cloneNode(true);

        node.id = "";

        node.children[0].text = res[i].Title;

        node.setAttribute('id', res[i].imdbID);
        node.setAttribute('data-imdbid', res[i].imdbID);
        node.setAttribute('data-title', res[i].Title);

        if( !has_favorite( res[i].imdbID ) ){
          fav_btn = document.getElementById( 'template-favorite-btn' ).cloneNode(true);
          node.appendChild( fav_btn );
        }

        node.addEventListener('click', function(event){
          omdb_detail( event.target );
        });

        document.getElementById('search-results').appendChild(node);
      }

      document.querySelector('.favorite').addEventListener('click', function(event){
        set_favorite( event.target );
      });

    });

  });

  get_favorites( function(){
    document.getElementById("search-submit").removeAttribute('disabled');
  });

})();
