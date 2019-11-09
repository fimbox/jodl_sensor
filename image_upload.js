var albumBucketName = "camera.webapp.imagestore";
var bucketRegion = "us-east-1";
var IdentityPoolId = "us-east-1:e250217b-b477-4ac6-ad28-5f31dcd37b4d";

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});

var s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: albumBucketName }
});

function getHtml(template) 
{
  return template.join('\n');
}

function listAlbums() 
{
  s3.listObjects({ Delimiter: "/" }, function(err, data) 
  {
	  console.log("listObjects returned " + err);
	  
    if (err) 
	{
	  console.log("error listing your albums: " + err.message);
      return;
    } else 
	{
		
      var albums = data.CommonPrefixes.map(function(commonPrefix) {
        var prefix = commonPrefix.Prefix;
        var albumName = decodeURIComponent(prefix.replace("/", ""));
        return getHtml([
          "<li>",
          "<span onclick=\"deleteAlbum('" + albumName + "')\">X</span>",
          "<span onclick=\"viewAlbum('" + albumName + "')\">",
          albumName,
          "</span>",
          "</li>"
        ]);
      });
      var message = "";
      var htmlTemplate = [
        "<h4>Folders</h4>",
        message,
        "<ul>",
        getHtml(albums),
        "</ul>"
      ];
      document.getElementById("upload_app").innerHTML = getHtml(htmlTemplate);
    }
  });
}

function createFolder(folder_name) 
{
  folder_name = folder_name.trim();
  if (!folder_name || folder_name.indexOf("/") !== -1) 
  {
	console.log("invalid folder name" + folder_name);
    return;
  }

  var albumKey = encodeURIComponent(folder_name) + "/";
  s3.headObject({ Key: albumKey }, function(err, data) 
  {
    if (!err) 
	{
	  //console.log("folder already exists " + folder_name);
      return;
    }
    if (err.code !== "NotFound") 
	{
      console.log("Error headObject folder: " + err.message);
	  return;
    }
    s3.putObject({ Key: albumKey }, function(err, data) 
	{
      if (err) 
	  {
        console.log("Error putObject folder: " + err.message);
		return;
      }
      console.log("Successfully created album " + folder_name);
      
    });
  });
}

function viewAlbum(albumName) 
{
  var albumPhotosKey = encodeURIComponent(albumName) + "/";
  s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) {
    if (err) {
      return alert("There was an error viewing your album: " + err.message);
    }
    // 'this' references the AWS.Response instance that represents the response
    var href = this.request.httpRequest.endpoint.href;
    var bucketUrl = href + albumBucketName + "/";

    var photos = data.Contents.map(function(photo) 
	{
		
      var photoKey = photo.Key;
      var photoUrl = bucketUrl + encodeURIComponent(photoKey);
      return getHtml([
        "<span>",
        "<div>",
        '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
        "</div>",
        "<div>",
        "<span onclick=\"deletePhoto('" +
          albumName +
          "','" +
          photoKey +
          "')\">",
        "X",
        "</span>",
        "<span>",
        photoKey.replace(albumPhotosKey, ""),
        "</span>",
        "</div>",
        "</span>"
      ]);
    });
    var message = "";
	
    var htmlTemplate = [
      "<h4>",
      "Folder: " + albumName,
      "</h4>",
      message,
      "<div>",
      getHtml(photos),
      "</div>",
      '<input id="photoupload" type="file" accept="image/*">',
      '<button id="addphoto" onclick="addPhoto(\'' + albumName + "')\">",
      "Add Photo",
      "</button>",
      '<button onclick="listAlbums()">',
      "Back To Albums",
      "</button>"
    ];
    document.getElementById("upload_app").innerHTML = getHtml(htmlTemplate);
  });
}

/// unchecked
function getS3Filename(relative_file_name)
{
  return "https://s3.amazonaws.com/"+albumBucketName+"/"+relative_file_name;
}

function getLastImageURL(folder_name) 
{
  var last_motion_url = "undefined";
  var last_video_url = "undefined";
	
  var albumPhotosKey = encodeURIComponent(folder_name) + "/";
  s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) 
  {
    if (err) 
	{
		console.log("Error getting folder contents " + err.message);
		return;
    }
	
    // 'this' references the AWS.Response instance that represents the response
    var href = this.request.httpRequest.endpoint.href;
    var bucketUrl = href + albumBucketName + "/";
	
	var newest_motion_date = null;
	var newest_video_date = null;
	
	/// TODO: get last_img_url from last entry of data.Contents
    var files = data.Contents.map(function(file) 
	{
		var is_motion = file.Key.indexOf("motion_") !== -1;
		var is_camera = file.Key.indexOf("camera_") !== -1;
		
		if(is_motion)
		{
			if( newest_motion_date == null || file.LastModified.getTime() > newest_motion_date.getTime() )
			{
				last_motion_url = bucketUrl + file.Key;
				newest_motion_date = file.LastModified;
			}
		}
		
		if(is_camera)
		{
			if( newest_video_date == null || file.LastModified.getTime() > newest_video_date.getTime() )
			{
				last_video_url = bucketUrl + file.Key;
				newest_video_date = file.LastModified;
			}			
		}
    });
	 
	console.log(last_motion_url);
	document.getElementById("last_img_url").innerHTML = last_motion_url;
	
	document.getElementById("camera--output").src = last_motion_url;
	document.getElementById("camera--view").src = last_video_url;
	 
  })
  
}

function addImage(folder_name, image_file_name, image_data)
{
  var file = image_data;
  var fileName = image_file_name;
  var albumPhotosKey = encodeURIComponent(folder_name) + "/";

  var photoKey = albumPhotosKey + fileName;

  // Use S3 ManagedUpload class as it supports multipart uploads
  var upload = new AWS.S3.ManagedUpload(
  {
    params: 
	{
      Bucket: albumBucketName,
      Key: photoKey,
	  ACL: "public-read",
      Body: file
    }
  });
 
  upload.send(function(err, data) 
  {
	  if(err)
			console.log("Upload ERROR: " + err, data);
	  else
			console.log("upload succeeed "+photoKey);
	  
  });	
}


function deletePhoto(albumName, photoKey) {
  s3.deleteObject({ Key: photoKey }, function(err, data) {
    if (err) {
      return alert("There was an error deleting your photo: ", err.message);
    }
    alert("Successfully deleted photo.");
    viewAlbum(albumName);
  });
}

function deleteAlbum(albumName) {
  var albumKey = encodeURIComponent(albumName) + "/";
  s3.listObjects({ Prefix: albumKey }, function(err, data) {
    if (err) {
      return alert("There was an error deleting your album: ", err.message);
    }
    var objects = data.Contents.map(function(object) {
      return { Key: object.Key };
    });
    s3.deleteObjects(
      {
        Delete: { Objects: objects, Quiet: true }
      },
      function(err, data) {
        if (err) {
          return alert("There was an error deleting your album: ", err.message);
        }
        alert("Successfully deleted album.");
        listAlbums();
      }
    );
  });
}

function getBrowserName()
{
    var ua= navigator.userAgent, tem,
    M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if(/trident/i.test(M[1])){
        tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
        return 'IE '+(tem[1] || '');
    }
    if(M[1]=== 'Chrome'){
        tem= ua.match(/\b(OPR|Edge?)\/(\d+)/);
        if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera').replace('Edg ', 'Edge ');
    }
    M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
    if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
    return M.join(' ').replace(/ /g, "_");
}

