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
    const targetElement = $(href);

    if (targetElement.length) {
      e.preventDefault();
      $('html, body').animate({
        scrollTop: targetElement.offset().top,
      }, 500, 'linear');
    }
  });

  loadCourseDetail();
});

function getCourseIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return parseInt(urlParams.get('id')) || 1;
}

function loadCourseDetail() {
  const courseId = getCourseIdFromUrl();

  fetch('/courses/courses.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(courses => {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        displayCourseDetail(course);
      } else {
        document.body.innerHTML = '<div style="text-align: center; padding: 5rem; font-size: 1.5rem;">Course not found. <a href="/courses">Back to courses</a></div>';
      }
    })
    .catch(error => {
      console.error('Error loading course:', error);
      document.body.innerHTML = '<div style="text-align: center; padding: 5rem; font-size: 1.5rem;">Error loading course. <a href="/courses">Back to courses</a></div>';
    });
}

function displayCourseDetail(course) {
  const stars = '★'.repeat(Math.floor(course.rating)) + '☆'.repeat(5 - Math.floor(course.rating));

  document.title = `${course.name} | Design Byte`;

  // Safely set element content with existence checks
  const setElementContent = (id, content) => {
    const el = document.getElementById(id);
    if (el) el.textContent = content;
  };

  const setElementAttr = (id, attr, value) => {
    const el = document.getElementById(id);
    if (el) el[attr] = value;
  };

  setElementContent('courseTitle', course.name);
  setElementContent('courseShortDesc', course.shortDesc);
  setElementAttr('courseImage', 'src', course.image);
  setElementContent('courseInstructor', course.instructor);
  setElementContent('courseRating', `${stars} ${course.rating}/5`);
  setElementContent('courseReviews', `${course.reviews} reviews`);
  setElementContent('courseDuration', course.duration);
  setElementContent('priceBadge', course.price);
  setElementContent('coursePrice', course.price);
  setElementContent('courseDescription', course.description);

  // Learn section
  let learnHtml = '';
  course.highlights.forEach(highlight => {
    learnHtml += `<li>${highlight}</li>`;
  });
  const learnEl = document.getElementById('learnList');
  if (learnEl) learnEl.innerHTML = learnHtml;

  // Curriculum section
  let curriculumHtml = '';
  course.syllabus.forEach((section, index) => {
    let topicsHtml = '';
    section.topics.forEach(topic => {
      topicsHtml += `<li>${topic}</li>`;
    });
    curriculumHtml += `
      <div class="curriculum-item">
        <div class="curriculum-header" onclick="toggleCurriculum(this)">
          <span class="curriculum-title">${section.section}</span>
          <i class="fas fa-chevron-down"></i>
        </div>
        <ul class="curriculum-topics" style="display: ${index === 0 ? 'block' : 'none'};">
          ${topicsHtml}
        </ul>
      </div>
    `;
  });
  const curriculumEl = document.getElementById('curriculumList');
  if (curriculumEl) curriculumEl.innerHTML = curriculumHtml;

  // Requirements section
  let requirementsHtml = '';
  course.requirements.forEach(requirement => {
    requirementsHtml += `<li>${requirement}</li>`;
  });
  const requirementsEl = document.getElementById('requirementsList');
  if (requirementsEl) requirementsEl.innerHTML = requirementsHtml;

  // Buy button handlers
  const buyBtn = document.getElementById('buyBtn');
  if (buyBtn) buyBtn.onclick = () => handleBuyNow(course);

  const buyBtnLarge = document.getElementById('buyBtnLarge');
  if (buyBtnLarge) buyBtnLarge.onclick = () => handleBuyNow(course);
}

function toggleCurriculum(element) {
  const list = element.nextElementSibling;
  const icon = element.querySelector('i');
  
  if (list.style.display === 'none') {
    list.style.display = 'block';
    icon.classList.add('rotate');
  } else {
    list.style.display = 'none';
    icon.classList.remove('rotate');
  }
}

function handleBuyNow(course) {
  // Navigate to checkout page with course ID
  window.location.href = `/checkout?id=${course.id}`;
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
