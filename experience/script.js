$(document).ready(function(){

    $('#menu').click(function(){
        $(this).toggleClass('fa-times');
        $('.navbar').toggleClass('nav-toggle');
    });

    $(window).on('scroll load',function(){
        $('#menu').removeClass('fa-times');
        $('.navbar').removeClass('nav-toggle');

        if(window.scrollY>60){
            document.querySelector('#scroll-top').classList.add('active');
        }else{
            document.querySelector('#scroll-top').classList.remove('active');
        }
    });

    /* Sort experience by date (latest first) */
    sortExperienceByDate();
});

function sortExperienceByDate() {
    const timeline = document.querySelector('.timeline');
    const containers = Array.from(document.querySelectorAll('.timeline .container'));

    containers.sort((a, b) => {
        const dateA = extractDate(a);
        const dateB = extractDate(b);
        return dateB - dateA;
    });

    containers.forEach(container => {
        timeline.appendChild(container);
    });
}

function extractDate(container) {
    const descText = container.querySelector('.desc p').textContent.trim();
    const dateRanges = descText.split(' - ');
    const startDate = dateRanges[0].trim();

    const monthYear = startDate.split(' ');
    const monthStr = monthYear[0];
    const year = parseInt(monthYear[1]);

    const months = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3,
        'May': 4, 'June': 5, 'July': 6, 'August': 7,
        'September': 8, 'October': 9, 'November': 10, 'December': 11
    };

    const month = months[monthStr];
    const date = new Date(year, month, 1);
    return date.getTime();
}

/* ===== SCROLL REVEAL ANIMATION ===== */
const srtop = ScrollReveal({
    origin: 'top',
    distance: '80px',
    duration: 1000,
    reset: true
});

/* SCROLL EXPERIENCE */
srtop.reveal('.experience .timeline',{delay: 400});
srtop.reveal('.experience .timeline .container',{interval: 400}); 




// disable developer mode
document.onkeydown = function(e) {
  if(e.keyCode == 123) {
     return false;
  }
  if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
     return false;
  }
  if(e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) {
     return false;
  }
  if(e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) {
     return false;
  }
  if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
     return false;
  }
}
