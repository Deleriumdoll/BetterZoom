BZ.addModule(
  'imgur.com', 
  function (imgur, moduleID) {
    $.extend(imgur, {
      domains: ['i.imgur.com'],
      apiPrefix: 'http://api.imgur.com/2/',
      hashRe: /^https?:\/\/(?:i\.|m\.|edge\.|www\.)*imgur\.com\/(?!gallery)(?!removalrequest)(?!random)(?!memegen)([A-Za-z0-9]{5}|[A-Za-z0-9]{7})[sbtmlh]?(\.(?:jpe?g|gif|png))?(\?.*)?$/i,
      albumHashRe: /^https?:\/\/(?:i\.|m\.)?imgur\.com\/(?:a|gallery)\/([\w]+)(\..+)?(?:\/)?(?:#\w*)?$/i,
      calls: {},
      checkLinkForMedia: function(mediaData) {
        var promise = new RSVP.Promise(function(resolve, reject) {
              var href = mediaData.link.href.split('?')[0],
                  groups = imgur.hashRe.exec(href),
                  albumGroups;

              // imgur direct links are safe. trust them and just resolve.
              if (mediaData.src) {
                resolve(mediaData);
              } else if (groups && !groups[2]) {
                if (groups[1].search(/[&,]/) > -1) {
                  // album code would go here, saving for later.
                  console.log('imgur album with & separator');
                } else {
                  mediaData.type = 'img';
                  mediaData.src = 'http://i.imgur.com/' + groups[1] + '.jpg';
                  resolve(mediaData);
                }
              } else {
                albumGroups = imgur.albumHashRe.exec(href);
                if (albumGroups && albumGroups[1]) {
                  var apiURL = imgur.apiPrefix + 'album/' + albumGroups[1] + '.json';
                  if (apiURL in imgur.calls) {
                    if (imgur.calls[apiURL] !== null) {
                      resolve(imgur.calls[apiURL]);
                    } else {
                      reject();
                    }
                  } else {
                    console.log('make call',apiURL);
                    BabelExt.xhr({
                      method: 'GET',
                      url: apiURL,
                      // aggressiveCache: true,
                      onload: function(response) {
                        try {
                          var json = JSON.parse(response.responseText),
                              idx, image;

                          mediaData.type = 'album';
                          mediaData.images = [];
                          mediaData.title = json.album.title;
                          for (idx in json.album.images) {
                            image = json.album.images[idx];
                            mediaData.images.push({
                              src: image.links.original,
                              title: image.image.title
                            });
                          }
                          imgur.calls[apiURL] = mediaData;
                          resolve(mediaData);
                        } catch (error) {
                          console.log('ERROR');
                          imgur.calls[apiURL] = null;
                          reject();
                        }
                      },
                      onerror: function(response) {
                        reject();
                      }
                    });
                  }
                }
              }
        });
        return promise;
      }
    });
  }
);