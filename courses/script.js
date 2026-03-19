$(document).ready(function () {

  $('#menu').click(function () {
    $(this).toggleClass('fa-times');
    $('.navbar').toggleClass('nav-toggle');
  });

  $(window).on('scroll load', function () {
    $('#menu').removeClass('fa-times');
    $('.navbar').removeClass('nav-toggle');

    if (window.scrollY > 60) {
      document.querySelector('#scroll-top').classList.add('active');
    } else {
      document.querySelector('#scroll-top').classList.remove('active');
    }
  });

  // smooth scrolling - only for links that exist on this page
  $('a[href*="#"]').on('click', function (e) {
    const href = $(this).attr('href');

    // Extract the hash part from href (handle both #anchor and /#anchor formats)
    let anchorId;
    if (href.includes('/#')) {
      anchorId = href.split('/#')[1];
    } else if (href.startsWith('#')) {
      anchorId = href.substring(1);
    } else {
      return;
    }

    if (!anchorId) {
      return;
    }

    const targetElement = $('#' + anchorId);

    if (targetElement.length) {
      e.preventDefault();
      $('html, body').animate({
        scrollTop: targetElement.offset().top,
      }, 500, 'linear');
    }
  });

  loadCourses();
});

function loadCourses() {
  fetch('/courses/courses.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(courses => {
      displayCourses(courses);
    })
    .catch(error => {
      console.error('Error fetching courses:', error);
      document.querySelector('.courses-container').innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">Error loading courses. Please try again later.</p>';
    });
}

function displayCourses(courses) {
  const container = document.querySelector('.courses-container');
  let html = '';

  courses.forEach(course => {
    const stars = '★'.repeat(Math.floor(course.rating)) + '☆'.repeat(5 - Math.floor(course.rating));

    html += `
      <div class="course-card" onclick="navigateToCourseDetail(${course.id})">
        <img src="${course.image}" alt="${course.name}" class="course-card-image">
        <div class="course-card-content">
          <h3>${course.name}</h3>
          <p class="course-card-instructor">${course.instructor}</p>
          
          <div class="course-card-rating">
            <span class="course-card-stars">${stars}</span>
            <span class="course-card-reviews">(${course.reviews} reviews)</span>
          </div>

          <p class="course-card-description">${course.shortDesc}</p>

          <div class="course-card-footer">
            <span class="course-card-price">${course.price}</span>
            <span class="course-card-duration">
              <i class="fas fa-clock"></i> ${course.duration}
            </span>
          </div>
        </div>
        <button class="course-card-btn" onclick="event.stopPropagation(); navigateToCourseDetail(${course.id})">Course Preview ></button>
      </div>
    `;
  });

  container.innerHTML = html;
}

function navigateToCourseDetail(courseId) {
  window.location.href = `/courses/coursedetail.html?id=${courseId}`;
}

// Disable developer mode
document.onkeydown = function (e) {
  if (e.keyCode == 123) {
    return false;
  }
  if (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) {
    return false;
  }
  if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
    return false;
  }
}
