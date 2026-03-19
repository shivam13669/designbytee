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

  loadServices();
});

function loadServices() {
  fetch('/services/services.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(services => {
      displayServices(services);
    })
    .catch(error => {
      console.error('Error fetching services:', error);
      document.querySelector('.services-container').innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; font-size: 1.5rem;">Error loading services. Please try again later.</p>';
    });
}

function displayServices(services) {
  const container = document.querySelector('.services-container');
  let html = '';

  services.forEach(service => {
    const highlightsHtml = service.highlights.map(highlight => `<li>${highlight}</li>`).join('');

    html += `
      <div class="service-card">
        <div class="service-card-header">
          <i class="${service.icon} service-card-icon"></i>
          <div class="service-card-title">${service.name}</div>
          <div class="service-card-category">${service.category}</div>
        </div>
        <div class="service-card-content">
          <p class="service-card-description">${service.description}</p>

          <div class="service-highlights">
            <h4 class="highlights-label">What You'll Learn:</h4>
            <ul class="highlights-list">
              ${highlightsHtml}
            </ul>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
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
