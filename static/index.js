function changeLocation(loc) {
  window.location = loc;
}

function getCookies() {
  var cookies = {};

  if (document.cookie.length > 0) {
    var cArr = document.cookie.split(';');
    cArr.forEach(e => {
      var cookie = e.split('=');
      cookies[cookie[0]] = cookie[1];
    });
  }

  return cookies;
}

function setCookie(key, val) {
  var d = new Date();
  d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000); // in milliseconds
  document.cookie = `${key}=${val};path=/;expires=` + d.toGMTString() + ';';
}

function callSubmitAnswer(forRiddle) {
  const answer = $('#riddleAnswer').val();
  $.ajax({
    method: 'POST',
    url: '/submit/answer/' + forRiddle,
    data: {
      answer
    }
  }).done((body, resp, xhr) => {
    if (body.success) {
      $('#correctAnswerModel').modal('show');
    } else {
        console.log('inside 400')
      $('#wrongAnswerModel').modal('show');
    }
  });
}

$(document).ready(function() {
  $('#loginButton').show();

  $('#authButton').on('click', () => {
    $.ajax({
      method: 'POST',
      url: '/public/auth'
    }).done((body, status, xhr) => {
      // const resp = JSON.parse(body);
      if (xhr.status == 200) {
        $('#signupModal').modal('show');
      }
    });
  });

  $('#searchUsers').keypress(function(event){
    var keycode = (event.keyCode ? event.keyCode : event.which);
	if(keycode == '13'){
		console.log('enter pressed');
	}
});

  $('#submitRiddleButton').on('click', () => {
    var title = $('#riddleName').val();
    var riddle = $('#riddleContent').val();
    var answers = $('#riddleAnswer').val();
    if (title && riddle && answers) {
      var loggedIn = getCookies().sid !== undefined;
      if (!loggedIn) {
        $('#notLoggedInModal').modal('show');
      } else {
        $.ajax({
          method: 'POST',
          url: '/submit/riddle',
          data: {
            title,
            riddle,
            answers
          }
        }).done((body, status, xhr) => {
          // const resp = JSON.parse(body);
          console.log(body);
          if (xhr.status == 200) {
            $('#thanksRiddleModal').modal('show');
          }
        });
      }
    } else if (!riddle) {
      $('#emptyRiddleModal').modal('show');
    } else if (!title) {
      $('#emptyNameModal').modal('show');
    } else if (!answers) {
      $('#emptyAnswerModal').modal('show');
    }
  });
});
