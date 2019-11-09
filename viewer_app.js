

var track = null;
var old_image_data = null;
var alarm_sound = null;
var alarm_sound_url = "";
var play_sound_sec = 2;
var motion_secs_idle = 1000000;
var show_camera_window = false;
var upload_motion_images = false;
var upload_camera_view_images = false;
var user_id_name = "unkown_user";
var update_images = true;

var PIXEL_VALUE_TH = 100;
var NUM_PIXEL_MOTION_TH = 0.01;
var NUM_PIXEL_OVER_MOTION_TH = 0.1;




function setThresholdValues()
{
	//var px_form = document.getElementById("px_form");
	
	PIXEL_VALUE_TH = document.getElementById("pixel_value_form").value;
	NUM_PIXEL_MOTION_TH = document.getElementById("sensitivity_value_form").value*0.001;
	NUM_PIXEL_OVER_MOTION_TH = document.getElementById("sensitivity_overshot_form").value*0.001;
	
	show_camera_window = document.getElementById("show_camera_window").checked;
	upload_motion_images = document.getElementById("upload_motion_images").checked;
	upload_camera_view_images = document.getElementById("upload_camera_view_images").checked;
	
	alarm_sound_url = document.getElementById("motion_sound_url_form").value;
	
	user_id_name = document.getElementById("user_id_name").value;
	
	update_images = document.getElementById("update_images").checked;
	
	if(alarm_sound)
	{
		alarm_sound.pause();
		alarm_sound.currentTime = 0.0;	
		delete alarm_sound;
	}
	
	alarm_sound = new Audio(alarm_sound_url);
	
	play_sound_sec = document.getElementById("time_play_no_motion").value;
	
}		

function testSound()
{
	alarm_sound.pause();
	alarm_sound.currentTime = 0.0;	
	alarm_sound.play();
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

function uploadSettings()
{
	addImage(user_id_name, "settings.png", "askljosdhfiopzysd9f89wzh45klnysdf8");
}

function loadLastImage()
{
	getLastImageURL(user_id_name);

}

function onTick()
{
	if(document.getElementById("update_images").checked)
	{
		loadLastImage();
	}
}



setThresholdValues();
listAlbums();

window.setInterval(onTick, 1000)




