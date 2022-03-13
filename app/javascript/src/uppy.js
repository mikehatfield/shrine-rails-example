import { Core, XHRUpload, AwsS3, AwsS3Multipart } from 'uppy'




//NEED TO FIX THIS AND MOVE TO IMPORT #############################################################
//#################################################################################################
//#################################################################################################
//#################################################################################################

// clientside-video-thumbnails
//
// Github: https://github.com/SCRMHub/clientside-video-thumbnails
// 
// This version custom from open PR: https://github.com/SCRMHub/clientside-video-thumbnails/pull/1
//
// Idea originally from: https://github.com/transloadit/uppy/issues/1737#issuecomment-567497816
(function(window, document, undefined) {
  /**
   * Class creation
   * @param  {array} opts  Any overriding options
   */
  function VideoThumbnails(opts) {
      this.video;
      this.videoHeight;
      this.videoWidth;
      this.videoDuration;
      this.videoInterval;
      this.videoStart;
      this.completed = 0;
      this.captures = [];
      this.capturesDetailed = {};
      this.events = {};
      this.currentShot = 0;
      this.startTime  = null;
      this.lastTime   = null;

      //Default options
      this.defaults = {
          maxWidth        : 1280,
          maxHeight       : 1280,
          count           : 8
      }

      /**
       * Current options
       * @type {Object}
       */
      this.opts = {};

      /**
       * Current options
       * @type {Object}
       */
      this.opts = VideoThumbnails.extend({}, this.defaults, opts || {});
  };

  VideoThumbnails.prototype = {
      /**
       * Register events
       * @param  {name}       event    Function to hook onto
       * @param  {Function}   callback What to call
       */
      on: function (event, callback) {
        event = event.toLowerCase();
        if (!this.events.hasOwnProperty(event)) {
          this.events[event] = [];
        }
        this.events[event].push(callback);
      },

      /**
       * Remove event callback
       * @function
       * @param {string} [event] removes all events if not specified
       * @param {Function} [fn] removes all callbacks of event if not specified
       */
      off: function (event, fn) {
        if (event !== undefined) {
          event = event.toLowerCase();
          if (fn !== undefined) {
            if (this.events.hasOwnProperty(event)) {
              arrayRemove(this.events[event], fn);
            }
          } else {
            delete this.events[event];
          }
        } else {
          this.events = {};
        }
      },

      /**
       * Fire an event
       * @function
       * @param {string} event event name
       * @param {...} args arguments of a callback
       * @return {bool} value is false if at least one of the event handlers which handled this event
       * returned false. Otherwise it returns true.
       */
      fire: function (event, args) {
        // `arguments` is an object, not array, in FF, so:
        args = Array.prototype.slice.call(arguments);
        event = event.toLowerCase();
        var preventDefault = false;
        if (this.events.hasOwnProperty(event)) {
          each(this.events[event], function (callback) {
            preventDefault = callback.apply(this, args.slice(1)) === false || preventDefault;
          }, this);
        }
        if (event != 'catchall') {
          args.unshift('catchAll');
          preventDefault = this.fire.apply(this, args) === false || preventDefault;
        }
        return !preventDefault;
      },

      /**
       * Start capturing
       * @param  {file} file   The local filename to work with
       */
      capture(file) {
          //Need this in the events
          var thisClass = this;

          this.fire('beforeCapture');

          this.lastTime = this.startTime   = (new Date()).getTime();

          var data = new FormData();
              data.append("file", file, file.name);

          var url = window.URL || window.webkitURL;
          var fileURL = url.createObjectURL(file);

          var videoHtml = document.createElement('video');
              videoHtml.setAttribute('id', 'videoHtmlCapture');
              videoHtml.setAttribute('controls', true);
              videoHtml.setAttribute('preload', 'metadata');
              videoHtml.setAttribute('crossorigin', '*');
              videoHtml.setAttribute('width', 600);
              videoHtml.setAttribute('muted', true); //added for ios thumnbail generation
              videoHtml.setAttribute('playsinline', true); //added for ios thumnbail generation
              videoHtml.setAttribute('src', fileURL);

          var theVideo = document.createElement('source');
              theVideo.setAttribute('src', fileURL);
              theVideo.setAttribute('type', file.type);

          videoHtml.appendChild(theVideo);
          this.video = videoHtml;            

          //As soon as the meta is ready, trigger that capture is ready
          this.video.onloadedmetadata = function() {
              thisClass.fire('startCapture', this.captures);
              thisClass.video.play();
          };

          //Trigger the capture here because the video is ready
          this.video.onplay = function() {
              thisClass.initScreenshot();
          };

          //Can't play this video
          this.video.onerror = function() {
              thisClass.fire('unsupported');
          };

          this.video.addEventListener('seeked', function() {
              //Check we still have a video (might have been cancelled)
              if(thisClass.video) {
                  thisClass.video.pause()
                  thisClass.captureScreenShot();
              }
          });
      },

      /**
       * Setup the screenshot
       */
      initScreenshot() {
          this.thumbWidth      = this.video.videoWidth;
          this.thumbHeight     = this.video.videoHeight; 

          //Wide video
          if(this.thumbWidth > this.thumbHeight) {
              var ratio           = this.opts.maxWidth / this.thumbWidth;

              this.thumbWidth     = this.opts.maxWidth;
              this.thumbHeight    = parseInt(this.thumbHeight * ratio);

          //square video
          } else if(this.thumbWidth === this.thumbHeight) {
              this.thumbWidth     = this.opts.maxWidth;
              this.thumbHeight    = this.opts.maxHeight;

          //tall video
          } else {
              var ratio = this.opts.maxHeight / this.thumbHeight;
              this.thumbHeight    = this.opts.maxHeight;
              this.thumbWidth     = parseInt(this.thumbWidth * ratio);
          }

          this.video.width = this.thumbWidth;
          this.video.height = this.thumbHeight;

          this.videoDuration = this.video.duration;
          this.videoInterval = this.videoDuration / (this.opts.count + 1); //this will ensure credits are ignored
          this.videoStart    = this.videoInterval / 2;

          //Prepare the next shot
          this.prepareScreenshot();
      },

      /**
       * This will work out what the next shot is, and move the video to that point (doesn't take the shot)
       * Doesn't return anything. The video seek will capture the shot
       */
      prepareScreenshot() {
          this.currentShot++;

          var newTime = Math.floor(this.videoStart + (this.currentShot * this.videoInterval) - this.videoInterval);
          var statTime = this.getTime();

          this.capturesDetailed[this.currentShot] = {
              capture     : this.currentShot,
              width       : this.thumbWidth,
              height      : this.thumbHeight,
              timeindex   : newTime,
              startTime   : statTime.fromStart,
              captureTime : null
          };

          this.video.currentTime = newTime;
      },

      /**
       * Capture the shot by using a canvas element
       */
      captureScreenShot() {
          var canvas = document.createElement('canvas');
              canvas.width  = this.thumbWidth;
              canvas.height = this.thumbHeight;

          var ctx = canvas.getContext('2d');
              ctx.drawImage(this.video, 0, 0, this.thumbWidth, this.thumbHeight); 

          //and save
          this.save(canvas);
      },

      /**
       * Save the captire
       * @param  {canvas} canvas The captured thumb
       */
      save(canvas) {
          //Get the shot
          var theCapture = canvas.toDataURL("image/jpeg", 0.7);

          //done
          this.grabComplete(theCapture);
      },

      /**
       * Complete the 
       * @param  {image} image   The image captured
       */
      grabComplete(image) {
          var counter = this.currentShot;
          this.completed += 1;

          //Stats are nice
          var statTime = this.getTime();

          //Save it to the array
          this.captures.push(image);
          this.capturesDetailed[counter].url = image;
          this.capturesDetailed[counter].captureTime = statTime.diff;

          //Fire the event incase anyone is listening
          this.fire('capture', image);

          //All done so remove the elements
          if(this.completed >= this.opts.count) {
              this.cleanUp();
              this.fire('complete', this.captures);

              var stats = this.getTime();

              this.fire('completeDetail', {
                  thumbs          : this.capturesDetailed,
                  totalTime       : stats.fromStart,
                  details  : {
                      thumbnailCount  : this.opts.count,
                      videoDuration   : this.videoDuration,
                      videoInterval   : this.videoInterval,
                      thumbWidth      : this.thumbWidth,
                      thumbHeight     : this.thumbHeight,
                      videoStart      : this.videoStart
                  }
              });
          } else {
              //Prepare the next shot
              this.prepareScreenshot();
          }
      },
      /**
       * Clean up our files etc. Gets expensive on the CPU if it's all still running
       */
      cleanUp() {
          this.video       = null;
          delete this.video;
      },
      /**
       * Force and abort of the capture
       */
      abort() {
          //already finished
          if(this.completed >= this.opts.count) {
              return;
          }

          //crude but effective
          this.completed = this.opts.count + 1;

          //Do some tidying
          this.cleanUp();

          this.fire('aborted', this.captures);
      },
      /**
       * time tracking for our inner stats geek
       * @return {array} The stats
       */
      getTime() {
          var thisTime    = (new Date()).getTime(); 
          var diff        = thisTime - this.lastTime;
          var fromStart   = thisTime - this.startTime;
          this.lastTime   = thisTime;

          return {
              diff        : diff,
              fromStart   : fromStart
          }
      }
  };

  /**
   * Useful function for remove something from and array
   * @param  {array} array    array object to modify
   * @param  {string} value   value to find
   */
  function arrayRemove(array, value) {
      var index = array.indexOf(value);
      if (index > -1) {
          array.splice(index, 1);
      }
  }

  /**
  * If option is a function, evaluate it with given params
  * @param {*} data
  * @param {...} args arguments of a callback
  * @returns {*}
  */
  function evalOpts(data, args) {
      if (typeof data === "function") {
          // `arguments` is an object, not array, in FF, so:
          args = Array.prototype.slice.call(arguments);
          data = data.apply(null, args.slice(1));
      }
      return data;
  }
  VideoThumbnails.evalOpts = evalOpts;

  /**
  * Extends the destination object `dst` by copying all of the properties from
  * the `src` object(s) to `dst`. You can specify multiple `src` objects.
  * @function
  * @param {Object} dst Destination object.
  * @param {...Object} src Source object(s).
  * @returns {Object} Reference to `dst`.
  */
  function extend(dst, src) {
      each(arguments, function(obj) {
          if (obj !== dst) {
              each(obj, function(value, key){
                  dst[key] = value;
              });
          }
      });
      return dst;
  }
  VideoThumbnails.extend = extend;

  /**
  * Iterate each element of an object
  * @function
  * @param {Array|Object} obj object or an array to iterate
  * @param {Function} callback first argument is a value and second is a key.
  * @param {Object=} context Object to become context (`this`) for the iterator function.
  */
  function each(obj, callback, context) {
      if (!obj) {
          return ;
      }
      var key;
      // Is Array?
      if (typeof(obj.length) !== 'undefined') {
        for (key = 0; key < obj.length; key++) {
          if (callback.call(context, obj[key], key) === false) {
            return ;
          }
        }
      } else {
        for (key in obj) {
          if (obj.hasOwnProperty(key) && callback.call(context, obj[key], key) === false) {
            return ;
          }
        }
      }
  }
  VideoThumbnails.each = each;

  if ( typeof module === "object" && module && typeof module.exports === "object" ) {
      // Expose as module.exports in loaders that implement the Node
      // module pattern (including browserify). Do not create the global, since
      // the user will be storing it themselves locally, and globals are frowned
      // upon in the Node module world.
      module.exports = VideoThumbnails;
  } else {
      // Otherwise expose to the global object as usual
      window.VideoThumbnails = VideoThumbnails;
  }    
})(window, document);


// END ############################################################################################
//#################################################################################################
//#################################################################################################
//#################################################################################################










// START uppy code ###############################################################################


export function uppyInstance({ id, types, server }) {
  const uppy = new Core({
    id: id,
    autoProceed: false,
    onBeforeFileAdded: (currentFile, files) => {
      console.log("onBeforeFileAdded");
      if (currentFile.size > 204857600) {
        console.log("This video exceeds the limit of 200MB. Please compress or shorten your video clip.");
        alert("This video exceeds the limit of 200MB. Please compress or shorten your video clip.");
        return false
      }
    },
    restrictions: {
      allowedFileTypes: types,
      maxNumberOfFiles: 2,
    },
  })

  uppy.on('file-added', (file) => {
    console.log('File has been added')
    if(file.type.includes('video'))
    {
        console.log('video file');

        const thumbnailCount = 1;
        console.log('thumbnailCount: ' + thumbnailCount);
        var thumbnails = new VideoThumbnails({
            count : thumbnailCount,
            maxWidth : 400,
            maxHeight : 400
        });
        console.log('thumbnails: ' + thumbnails);
        //Captured a thumb
        thumbnails.on('capture', function(image) {
          console.log('video file capture function');
          console.log('file.id: ' + file.id);
            let videoId = file.id.split('/').slice(-1).pop();
            console.log(videoId)
            // $('li[id*="' + videoId + '"]')
            //     .find('.uppy-Dashboard-Item-previewInnerWrap')
            //     .html('<img class="uppy-DashboardItem-previewImg" src="'+image+'"/>');
            console.log('ID computed: uppy_"' + file.id + '');
            var container = document.getElementById('uppy_' + file.id + '');
            console.log('container: ' + container);
            var preview_item = container.querySelector(".uppy-Dashboard-Item-previewInnerWrap");
            console.log('preview_item: ' + preview_item);
            console.log('current preview_item.innerHTML' + preview_item.innerHTML);
            console.log("image: " + image);
            
            // Fix base64 image hack for iOS Safari
            // Add an actual base64 string
            var encodedImgString = image;
            
            //check if ios Safari then do base64 hack

            const isIOSSafari = !!window.navigator.userAgent.match(/Version\/[\d\.]+.*Safari/);
            if (isIOSSafari) {
              //split into two strings in array
              //In first item: data:image/jpeg;base64, 
              //In second item: the image data 
              var base64result = image.split(',');

              console.log("base64result[0]: " + base64result[0]);
              console.log("base64result[1]: " + base64result[1]);
              while (base64result[1].length % 4 > 0) {
                //add padding
                base64result[1] += '=';
              }
              image = base64result[0] + "," + base64result[1];
              console.log("new image: " + image);
            }
            // End Fix base64 image hack for iOS Safari

            preview_item.innerHTML = '<img class="uppy-Dashboard-Item-previewImg"  src="'+image+'" crossorigin="Anonymous" />';
            //preview_item.appendChild(iosImg);
        });
        thumbnails.capture(file.data);
    }
  })

  if (server == 's3') {
    uppy.use(AwsS3, {
      companionUrl: '/', // will call Shrine's presign endpoint mounted on `/s3/params`
    })
  } else if (server == 's3_multipart') {
    uppy.use(AwsS3Multipart, {
      companionUrl: '/' // will call uppy-s3_multipart endpoint mounted on `/s3/multipart`
    })
  } else {
    uppy.use(XHRUpload, {
      endpoint: '/upload', // Shrine's upload endpoint
    })
  }

  return uppy
}

export function uploadedFileData(file, response, server) {
  if (server == 's3') {
    const id = file.meta['key'].match(/^cache\/(.+)/)[1]; // object key without prefix

    return JSON.stringify(fileData(file, id))
  } else if (server == 's3_multipart') {
    const id = response.uploadURL.match(/\/cache\/([^\?]+)/)[1]; // object key without prefix

    return JSON.stringify(fileData(file, id))
  } else {
    return JSON.stringify(response.body)
  }
}

// constructs uploaded file data in the format that Shrine expects
function fileData(file, id) {
  return {
    id: id,
    storage: 'cache',
    metadata: {
      size:      file.size,
      filename:  file.name,
      mime_type: file.type,
    }
  }
}
