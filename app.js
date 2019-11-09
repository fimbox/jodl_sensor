// Set constraints for the video stream
var constraints = { video: { facingMode: "user" }, audio: false };
var track = null;
var old_image_data = null;
var alarm_sound = null;
var alarm_sound_url = "";
var play_sound_sec = 2;
var motion_secs_idle = 1000000;
var show_camera_window = true;
var upload_motion_images = false;
var upload_camera_view_images = false;
var user_id_name = "";
var restart_sound_opt = false;
var PIXEL_VALUE_TH = 100;
var NUM_PIXEL_MOTION_TH = 0.01;
var NUM_PIXEL_OVER_MOTION_TH = 0.1;
var motion_window_l = 0;
var motion_window_r = 100;
var motion_window_u = 0;
var motion_window_d = 100;

var SOUND_CACHE_NAME = "jodl-sound-cache";
var APP_VERSION = ".3"

// Define constants
const cameraView = document.querySelector("#camera--view"),
    cameraOutput = document.querySelector("#camera--output"),
    cameraCanvas = document.querySelector("#camera--canvas"),
    cameraTrigger = document.querySelector("#camera--trigger");

// Access the device camera and stream to cameraView
function cameraStart() 
{
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function(stream) {
            track = stream.getTracks()[0];
            cameraView.srcObject = stream;
        })
        .catch(function(error) {
            console.error("Oops. Something is broken.", error);
        });
}

function setThresholdValues()
{
	//var px_form = document.getElementById("px_form");
	document.getElementById("app_version_cap").innerHTML = APP_VERSION;
	
	PIXEL_VALUE_TH = document.getElementById("pixel_value_form").value;
	NUM_PIXEL_MOTION_TH = document.getElementById("sensitivity_value_form").value*0.001;
	NUM_PIXEL_OVER_MOTION_TH = document.getElementById("sensitivity_overshot_form").value*0.001;
	motion_window_l = document.getElementById("motion_window_l").value;
	motion_window_r = document.getElementById("motion_window_r").value;
	motion_window_u = document.getElementById("motion_window_u").value;
	motion_window_d = document.getElementById("motion_window_d").value;
	
	show_camera_window = document.getElementById("show_camera_window").checked;
	upload_motion_images = document.getElementById("upload_motion_images").checked;
	upload_camera_view_images = document.getElementById("upload_camera_view_images").checked;
	
	alarm_sound_url = document.getElementById("motion_sound_url_form").value;
	
	user_id_name = document.getElementById("user_id_name").value;
	if(user_id_name == "")
	{
		user_id_name = getBrowserName() +"_"+ Math.random().toString(36).substring(7);
		document.getElementById("user_id_name").value = user_id_name;
	}
	
	if(alarm_sound)
	{
		alarm_sound.pause();
		alarm_sound.currentTime = 0.0;	
		delete alarm_sound;
	}
	
	alarm_sound = new Audio(alarm_sound_url);
	
	play_sound_sec = document.getElementById("time_play_no_motion").value;
	restart_sound_opt = document.getElementById("restart_sound_opt").checked;
	
	if(!show_camera_window)
		cameraView.style.display ="none";
	else
		cameraView.style.display ="block";
	
	
	cacheAlarmSound();
	
}		

function getFormattedTime() 
{
    var today = new Date();
    var y = today.getFullYear();
    var m = today.getMonth() + 1;
    var d = today.getDate();
    var h = today.getHours();
    var mi = today.getMinutes();
    var s = today.getSeconds();
    return y + "_" + m + "_" + d + "_" + h + "_" + mi + "_" + s;
}

function uploadMotionImage()
{
	createFolder(user_id_name);	
	var date_str = getFormattedTime();

	console.log("uploading motion image "+date_str);
	
	cameraCanvas.toBlob(function(blob) 
	{
		addImage(user_id_name, "motion_"+date_str + ".png", blob);
	});
}

function uploadCameraViewImage()
{
	createFolder(user_id_name);	
	var date_str = getFormattedTime();

	console.log("uploading camera image "+date_str);
	
	cameraCanvas.toBlob(function(blob) 
	{
		addImage(user_id_name, "camera_"+date_str + ".jpg", blob);
	}, "image/jpeg", 0.5 );
	
}

function cacheAlarmSound()
{
	document.getElementById("cache_support_cap").innerHTML = "checking";
	
	if('caches' in window) 
	{
		console.log("cache supported");
		
		caches.open(SOUND_CACHE_NAME).then(function(cache) 
		{  
		  cache.keys().then(function(cachedRequests)   
		  {
		    console.log("cached: '"+ cachedRequests.url+"'");
			if( cachedRequests.url == alarm_sound_url)
			{
				console.log("sound already cached");
				document.getElementById("cache_support_cap").innerHTML = "already cached";
				return;
			}
		  });
		});
		
		console.log("caching...");
		
		document.getElementById("cache_support_cap").innerHTML = "caching...";
		
		caches.open(SOUND_CACHE_NAME).then(function(cache) 
		{
			cache.addAll([alarm_sound_url]).then(function() 
			{
				console.log("resonse succeed");
				document.getElementById("cache_support_cap").innerHTML = "cached";
			}
			,function(err)
			{
				console.log("resonse error " + err);
				document.getElementById("cache_support_cap").innerHTML = err;
			}
			)
			
		});
			
	}
	else
	{
		console.log("cache not supported");
		document.getElementById("cache_support_cap").innerHTML = "not supported";
	}	
}

function onTick() 
{
	var cw =cameraView.videoWidth;
	var ch =cameraView.videoHeight;
	
	if(cw == 0 || ch == 0)
		return;
	
    cameraCanvas.width = cameraView.videoWidth;
    cameraCanvas.height = cameraView.videoHeight;
    const ctx = cameraCanvas.getContext("2d");
	
	
	ctx.drawImage(cameraView, 0, 0);
	
	if(upload_camera_view_images)
		uploadCameraViewImage();
	
	
	var my_image = ctx.getImageData(0, 0, cw, ch);
	
	var current_image_data = my_image.data;
	
	var image_diff_data = new Uint8ClampedArray(cw*ch*4);
	if(old_image_data==null)
		old_image_data = Uint8ClampedArray.from(current_image_data);
	
	var n_pixel_changed = 0;
	
	var x_start = motion_window_l * cw * 0.01;
	var x_end = motion_window_r * cw * 0.01;
	var y_start = motion_window_u * ch * 0.01;
	var y_end = motion_window_d * ch * 0.01;
	
	for(var x = x_start; x < x_end; x++)
	for(var y = y_start; y < y_end; y++)
	{
		var n = (y * cw + x)*4;
		
		var change = Math.abs(current_image_data[n] - old_image_data[n] );
		image_diff_data[n] = change; 
		
		if( change > PIXEL_VALUE_TH )
			n_pixel_changed ++;
		
	}
	
	old_image_data = Uint8ClampedArray.from(current_image_data);
	
	var motion_state = 0;
	
	if(n_pixel_changed > cw*ch * NUM_PIXEL_MOTION_TH )
		motion_state = 1;
	
	if(n_pixel_changed > cw*ch * NUM_PIXEL_OVER_MOTION_TH )
		motion_state = 2;
	
	/// just visualize the motion:
	for(var x = x_start; x < x_end; x++)
	for(var y = y_start; y < y_end; y++)
	{
		var n = (y * cw + x)*4;
		
		current_image_data[n] = image_diff_data[n]>PIXEL_VALUE_TH ? 255 : 0;
		
		if( motion_state == 1)
			current_image_data[n+1] = 255;
		
		if( motion_state == 2)
			current_image_data[n+2] = 255;
		
		current_image_data[n+3] = 255;
		
	}
	
	ctx.putImageData(my_image, 0, 0);
    cameraOutput.src = cameraCanvas.toDataURL("image/webp");
	
	if(motion_state == 1)
	{
		motion_secs_idle = 0;
		alarm_sound.play();
					
		// fade in
		var intervalID = setInterval(function() 
		{
			if (alarm_sound.volume <= 0.8 && alarm_sound.volume>0.0) 
			{
				alarm_sound.volume += 0.2;
			} 
			else 
			{
				clearInterval(intervalID);
				alarm_sound.volume = 1.0;
			}
		}, 100);
	
		
		if(upload_motion_images)
			uploadMotionImage();
	}
	else
	{
		motion_secs_idle ++;
		
		if(motion_secs_idle > play_sound_sec && alarm_sound.volume == 1.0)
		{
			alarm_sound.volume = 0.9
			// fade out
			var intervalID = setInterval(function() 
			{
				/// reactivated:
				if( alarm_sound.volume == 1.0)
				{
					clearInterval(intervalID);
					return;
				}
				
				if (alarm_sound.volume >= 0.1) 
				{
					alarm_sound.volume -= 0.1;
				} 
				else 
				{
					// Stop the setInterval when 0 is reached
					clearInterval(intervalID);
					
					alarm_sound.pause();
					if(restart_sound_opt)
						alarm_sound.currentTime = 0.0;
			
				}
            }, 100);
			
		}
		
	}

}


/// offline cache:
if ('serviceWorker' in navigator) 
{
  navigator.serviceWorker.register('service-worker.js')
  .then(function(registration) {
    console.log('Registered:', registration);
  })
  .catch(function(error) {
    console.log('Registration failed 0: ', error);
  });
}


function deleteAllCaches()
{
	caches.keys().then(function(names) {
		for (let name of names)
		{
			console.log("Delete cache: " + name);
			caches.delete(name);
		}
	});	
}

setThresholdValues();
listAlbums();


// Start the video stream when the window loads
window.addEventListener("load", cameraStart, false);
window.setInterval(onTick, 1000)
