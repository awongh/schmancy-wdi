(function(){

  /* =========   globals  ===================== */
  /* ========================================== */


  //global scope array that has all the user's favorites in it
  var user_favorites = [];


  /* =========   helper functions ============= */
  /* ========================================== */


  /* test to see if something is a function */
  //from: http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
  var isFunction = function(x) {
    return Object.prototype.toString.call(x) == '[object Function]';
  }


  /* =========     favorites      ============= */
  /* ========================================== */

  /* test to see if a user has already favorited something */
  var has_favorite = function( id ){
    for( var i = 0; i < user_favorites.length; i++ ){
      if( user_favorites[i]['imdbid'] == id ){
        return true;
      }
    }

    return false;
  }

  /* get a list of all the favorites from the server */
  /* note: this is called a lot, it's really inefficient*/
  var get_favorites = function( callback ){
    request_ajax('/favorites', 'get', "",  function(response){
      user_favorites = JSON.parse( this.response );

      if ( isFunction(callback) ){
        callback();
      }
    });
  };

  /* set a new favorite */
  /* we don't do any validation in this function-
   * the button should have been removed from
   * the dom before this button could be pressed */
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

  /* =========     movie details ============= */
  /* ========================================== */

  /* render the elements of the movie details in the dom */
  /* this function is set as the callback of the details ajax call to the omdb api call */
  var render_detail = function( response ){
    //make the response into a js object
    var res = JSON.parse( response.currentTarget.response );

    //copy the "template" html from the dom
    var node = document.getElementById("template-detail").cloneNode(true);

    //reset the template id of this new element
    node.id = "";

    //for each field in the result render it to the element that's
    //named the same in the template
    for(var key in res){
      if (res.hasOwnProperty(key)) {

        //skip this, we don't want to display it
        if( key == "Response" ) continue;

        //render the poster as an image
        if( key == "Poster" ){
          node.querySelector(".poster-img").setAttribute('src', res[key])
        }else{
          node.querySelector("."+key.toLowerCase()).innerHTML = node.querySelector("."+key.toLowerCase()).innerHTML + res[key];
        }
      }
    }

    document.getElementById(res.imdbID).querySelector('.detail-container').appendChild(node);
  };

  /* the generic ajax function */
  /* all the ajax requests go through this function */
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

  /* wrapper around the ajax function for omdb requests */
  var request_omdb = function( url_request, url_arguments, callback ){
    var params = url_request + "=" + url_arguments;
    request_ajax('http://omdbapi.com/?', 'get', params, callback);
  };

  /* wrapper around the omdb request just for search */
  var request_omdb_search = function( url_arguments, callback ) {
    request_omdb( "s", url_arguments, callback );
  };

  /* wrapper around the omdb request just for individual movies*/
  var request_omdb_detail = function( id, callback ) {
    request_omdb( "i", id, callback );
  };

  /* this is the click handler for a movie list element */
  /* it checks and sets some data-attributes so that it doesn't have
   * to make an ajax call more than once.*/
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

  /* this is the callback for an ajax call to the OMDB api */
  /* it gets some html from the "template" html and renders it
   * and sets all the listeners here */
  var render_omdb_search = function( response ){
    var res =  JSON.parse(this.response).Search;

    for(var i = 0; i < res.length; i++){

      var node = document.getElementById("template-search-result").cloneNode(true);

      node.id = "";

      node.children[0].text = res[i].Title;

      //set some data so that the favorites and deatil can use it later
      node.setAttribute('id', res[i].imdbID);
      node.setAttribute('data-imdbid', res[i].imdbID);
      node.setAttribute('data-title', res[i].Title);

      //decide wethere this has been favorited or not, render the button
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
  };

  /* the click handler for the search button */
  /* this does the ajax request, and the callback is written inline here */
  document.querySelector('form').addEventListener('submit', function(event){
    event.preventDefault();

    var input = document.querySelector('input').value;

    request_omdb_search( encodeURIComponent(input) , render_omdb_search);
  });

  /* clear the search */
  document.getElementById('clear-search').addEventListener('click', function(event){
    document.getElementById('search-results').innerHTML = "";
  });

  /* before we let the user do anything, get a list of their favorites */
  /* this will be the first thing we do on page load */
  get_favorites( function(){
    document.getElementById("search-submit").removeAttribute('disabled');
  });

})();
