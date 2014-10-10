# jsPlatform API

This is a simple wrapper around the [jsPlatform API](http://apidocs.jwplayer.com/)
to make api calls easier.

## Installation

`npm install jwplatform-api`

## Usage
Creating a new jwPlatform API object:

```javascript
var jwPlatform = require('jwplatform-api');

//initialize with your key and secret
var api = new jwPlatform({
    key: '...',
    secret: '...'
});

//initialize with custom logger
var logger = {
    debug: function() {},
    error: function() {}
};
var api = new jwPlatform({ ... }, logger);

//initialize with no logging
var api = new jwPlatform({ ... }, function() {});
```

Make arbitrary queries:

```javascript
api.get('v1/videos/show', { video_key: 'some_key' }, null, function(err, result) {
    //result will be a JSON object
});

var template = {
    name: 'Test template',
    format_key: 'ogg',
    default: 'none'
};

api.post('v1/templates/create', null, template, function(err, result) {
    //...
});
```

There are a few shortcuts for common api calls:

### Generating an upload URL
```javascript
api.getUploadUrl('v1', function(err, result) {
    //sample result:
    /*
    { uploadUrl: 'http://upload.jwplatform.com/v1/videos/upload?api_format=json&key=...&token=...',
      progressUrl: 'http://upload.jwplatform.com/progress?token=...&key...' }
     */
});
```

### Getting information about a video (conversions/list wrapper)
```javascript
api.getVideoData('v1', '<your video key>', function(err, result) {
    //sample result:
    /*
    { completed: 3,
         total: 3,
         videos:
          [ { status: 'ready',
              key: '...',
              width: 640,
              height: 360,
              size: 2165175,
              duration: 32.48,
              url: 'http://content.jwplatform.com/originals/....webm' },
            { status: 'ready',
              key: '...',
              width: 320,
              height: 180,
              size: 1114818,
              duration: 32.5,
              url: 'http://content.jwplatform.com/videos/...-....mp4' },
            { status: 'ready',
              key: '...',
              width: 480,
              height: 270,
              size: 1594358,
              duration: 32.5,
              url: 'http://content.jwplatform.com/videos/...-....mp4' } ],
         ready: true }
     */
});
```

### Template stuff
```javascript
var template = {
    name: 'the name',
    format_key: 'ogg',
    default: 'none'
};
api.createTemplate('v1', template, function(err, result) { });

var fields = {
    template_key: '...',
    name: 'the new name'
};
api.updateTemplate('v1', fields, function(err, result) { });

api.getTemplates('v1', function(err, result) { });
```

