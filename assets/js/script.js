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

        // scroll spy - use native JavaScript to avoid jQuery selector issues
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.navbar a');

        sections.forEach(section => {
            const height = section.offsetHeight;
            const offset = section.offsetTop - 200;
            const top = window.scrollY;
            const id = section.getAttribute('id');

            if (id && top > offset && top < offset + height) {
                // Remove active from all links
                navLinks.forEach(link => link.classList.remove('active'));

                // Add active to matching link(s)
                navLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href === `#${id}` || href === `/#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });

    // smooth scrolling - use native JavaScript only
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href*="#"]');
        if (!link) return;

        const href = link.getAttribute('href');

        // Skip if href is just "#" or doesn't contain valid anchor
        if (!href || href === '#') {
            return;
        }

        // Extract anchor from href (e.g., "#about" from "/#about")
        let anchorId;
        if (href.includes('/#')) {
            anchorId = href.split('/#')[1];
        } else if (href.startsWith('#')) {
            anchorId = href.substring(1);
        } else {
            return;
        }

        // Only proceed if we have a valid anchor
        if (!anchorId) {
            return;
        }

        const targetElement = document.getElementById(anchorId);

        // Check if target element exists on current page
        if (targetElement) {
            e.preventDefault();
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (href.startsWith('/#')) {
            // If link is to home anchor (e.g., /#about), redirect to home first
            e.preventDefault();
            window.location.href = href;
        }
    });

    // <!-- emailjs to mail contact form data -->
    $("#contact-form").submit(function (event) {
        emailjs.init("8E5B41l0zgZgR_hZu");

        emailjs.sendForm('service_52qp9pb', 'template_hn5wlrm', '#contact-form')
            .then(function (response) {
                console.log('SUCCESS!', response.status, response.text);
                document.getElementById("contact-form").reset();
                alert("Form Submitted Successfully");
            }, function (error) {
                console.log('FAILED...', error);
                alert("Form Submission Failed! Try Again");
            });
        event.preventDefault();
    });
    // <!-- emailjs to mail contact form data -->

    // <!-- typed js effect starts -->
    if (document.querySelector(".typing-text")) {
        var typed = new Typed(".typing-text", {
            strings: ["Frontend Development", "Backend Development", "Web Designing", "Android Development", "Web Development"],
            loop: true,
            typeSpeed: 50,
            backSpeed: 25,
            backDelay: 500,
        });
    }
    // <!-- typed js effect ends -->

    /* Sort experience by date (latest first) */
    sortExperienceByDate();

});

async function fetchData(type = "projects") {
    const response = await fetch("./projects/projects.json")
    const data = await response.json();
    return data;
}

function showProjects(projects) {
    let projectsContainer = document.querySelector("#work .box-container");
    let projectHTML = "";
    projects.slice(0, 10).filter(project => project.category != "android").forEach(project => {
        const viewBtn = project.links.view ? `<a href="${project.links.view}" class="btn" target="_blank"><i class="fas fa-eye"></i> View</a>` : `<span class="btn disabled"><i class="fas fa-eye"></i> View</span>`;
        const codeBtn = project.links.code ? `<a href="${project.links.code}" class="btn" target="_blank">Code <i class="fas fa-code"></i></a>` : `<span class="btn disabled">Code <i class="fas fa-code"></i></span>`;
        projectHTML += `
        <div class="box tilt">
      <img draggable="false" src="/assets/images/projects/${project.image}.png" alt="project" />
      <div class="content">
        <div class="tag">
        <h3>${project.name}</h3>
        </div>
        <div class="desc">
          <p>${project.desc}</p>
          <div class="btns">
            ${viewBtn}
            ${codeBtn}
          </div>
        </div>
      </div>
    </div>`
    });
    projectsContainer.innerHTML = projectHTML;

    // <!-- tilt js effect starts -->
    if (typeof VanillaTilt !== 'undefined') {
        VanillaTilt.init(document.querySelectorAll(".tilt"), {
            max: 15,
        });
    }
    // <!-- tilt js effect ends -->

    /* ===== SCROLL REVEAL ANIMATION ===== */
    if (typeof ScrollReveal !== 'undefined') {
        const srtop = ScrollReveal({
            origin: 'top',
            distance: '80px',
            duration: 1000,
            reset: true
        });

        /* SCROLL PROJECTS */
        srtop.reveal('.work .box', { interval: 200 });
    }

}

fetchData("projects").then(data => {
    showProjects(data);
});

async function fetchCourses() {
    const response = await fetch("./courses/courses.json");
    const data = await response.json();
    return data;
}

function showCourses(courses) {
    const coursesContainer = document.getElementById("coursesContainer");
    let courseHTML = "";

    courses.slice(0, 3).forEach(course => {
        courseHTML += `
        <div class="course-card" onclick="window.location.href='/courses'" style="cursor: pointer;">
            <img src="${course.image}" alt="${course.name}" class="course-image" draggable="false">
            <div class="course-content">
                <div class="course-header">
                    <h3 class="course-title">${course.name}</h3>
                    <p class="course-instructor">${course.instructor}</p>
                    <p class="course-desc">${course.shortDesc}</p>
                </div>
                <div class="course-meta">
                    <div>
                        <div class="course-price">${course.price}</div>
                        <div class="course-duration">${course.duration}</div>
                    </div>
                    <div class="course-rating">
                        <span class="stars">★ ${course.rating}</span>
                        <span class="reviews">(${course.reviews})</span>
                    </div>
                </div>
            </div>
        </div>`;
    });

    coursesContainer.innerHTML = courseHTML;

    if (typeof ScrollReveal !== 'undefined') {
        const srtop = ScrollReveal({
            origin: 'top',
            distance: '80px',
            duration: 1000,
            reset: true
        });
        srtop.reveal('.courses .course-card', { interval: 200 });
    }
}

fetchCourses().then(data => {
    showCourses(data);
});

async function fetchServices() {
    const response = await fetch("./services/services.json");
    const data = await response.json();
    return data;
}

function showServices(services) {
    const servicesContainer = document.getElementById("servicesContainer");
    let serviceHTML = "";

    // Display services with IDs 1, 4, and 6 (Full Stack, Video-Based Courses, Test Series)
    const selectedServices = services.filter(service => [1, 4, 6].includes(service.id));

    selectedServices.forEach(service => {
        const highlightsHtml = service.highlights.map(highlight => `<li>${highlight}</li>`).join('');

        serviceHTML += `
        <div class="service-card" onclick="window.location.href='/services'" style="cursor: pointer;">
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
        </div>`;
    });

    servicesContainer.innerHTML = serviceHTML;

    if (typeof ScrollReveal !== 'undefined') {
        const srtop = ScrollReveal({
            origin: 'top',
            distance: '80px',
            duration: 1000,
            reset: true
        });
        srtop.reveal('.services-featured .service-card', { interval: 200 });
    }
}

fetchServices().then(data => {
    showServices(data);
});

// <!-- tilt js effect starts -->
if (typeof VanillaTilt !== 'undefined') {
    VanillaTilt.init(document.querySelectorAll(".tilt"), {
        max: 15,
    });
}
// <!-- tilt js effect ends -->


// pre loader start
// function loader() {
//     document.querySelector('.loader-container').classList.add('fade-out');
// }
// function fadeOut() {
//     setInterval(loader, 500);
// }
// window.onload = fadeOut;
// pre loader end

// disable developer mode
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



/* ===== SCROLL REVEAL ANIMATION ===== */
if (typeof ScrollReveal !== 'undefined') {
    const srtop = ScrollReveal({
        origin: 'top',
        distance: '80px',
        duration: 1000,
        reset: true
    });

    /* SCROLL HOME */
    srtop.reveal('.home .content h3', { delay: 200 });
    srtop.reveal('.home .content p', { delay: 200 });
    srtop.reveal('.home .content .btn', { delay: 200 });

    srtop.reveal('.home .image', { delay: 400 });
    srtop.reveal('.home .linkedin', { interval: 600 });
    srtop.reveal('.home .github', { interval: 800 });
    srtop.reveal('.home .twitter', { interval: 1000 });
    srtop.reveal('.home .telegram', { interval: 600 });
    srtop.reveal('.home .instagram', { interval: 600 });
    srtop.reveal('.home .dev', { interval: 600 });

    /* SCROLL ABOUT */
    srtop.reveal('.about .content h3', { delay: 200 });
    srtop.reveal('.about .content .tag', { delay: 200 });
    srtop.reveal('.about .content p', { delay: 200 });
    srtop.reveal('.about .content .box-container', { delay: 200 });
    srtop.reveal('.about .content .resumebtn', { delay: 200 });

    /* SCROLL SERVICES */
    srtop.reveal('.services-featured .service-card', { interval: 200 });

    /* SCROLL COURSES */
    srtop.reveal('.courses .course-card', { interval: 200 });

    /* SCROLL PROJECTS */
    srtop.reveal('.work .box', { interval: 200 });

    /* SCROLL EXPERIENCE */
    srtop.reveal('.experience .timeline', { delay: 400 });
    srtop.reveal('.experience .timeline .container', { interval: 400 });

    /* SCROLL CONTACT */
    srtop.reveal('.contact .container', { delay: 400 });
    srtop.reveal('.contact .container .form-group', { delay: 400 });
}

function sortExperienceByDate() {
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;

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
