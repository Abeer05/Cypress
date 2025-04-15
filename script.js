// button.addEventListener("click", () => {
//   button.classList.add("hidden");
// });

// Global user credibility state
let userCredibility = {
  baseScore: 50, // Starting with a middle score
  totalReports: 0,
  totalPhotos: 0,
  locationEnabled: true, // Assuming location is enabled by default
  reportScores: [], // Will store individual report scores
};

function updateUserCredibilityDisplay() {
  const credibilityElement = document.getElementById("userCredibility");
  if (credibilityElement) {
    const score = calculateOverallCredibility();
    credibilityElement.textContent = `User Credibility: ${score}/100`;

    // Update the credibility class for styling
    credibilityElement.className = "";
    if (score >= 80) {
      credibilityElement.classList.add("high-credibility");
    } else if (score >= 50) {
      credibilityElement.classList.add("medium-credibility");
    } else {
      credibilityElement.classList.add("low-credibility");
    }
  }
}

function calculateOverallCredibility() {
  // Start with base score
  let score = userCredibility.baseScore;

  // Add points for number of previous reports (max 20 points)
  score += Math.min(userCredibility.totalReports * 2, 20);

  // Add points for photos (max 30 points)
  score += Math.min(userCredibility.totalPhotos * 3, 30);

  // Add points for location enabled
  if (userCredibility.locationEnabled) {
    score += 15;
  }

  // Ensure score stays within 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateReportCredibility(
  photoCount,
  hasLocation,
  corroboratingReports = 0
) {
  let reportScore = 50; // Base score

  // Add points for photos
  reportScore += photoCount * 10;

  // Add points for location precision
  if (hasLocation) {
    reportScore += 15;
  }

  // Add points for corroborating reports
  reportScore += corroboratingReports * 5;

  // Cap at 100
  return Math.min(100, reportScore);
}

function dotCheck(slideContainer) {
  const slides = slideContainer.querySelectorAll(".slide");
  const dotsContainer = slideContainer.querySelector(".slider-dots");

  // Clear any existing dots first
  dotsContainer.innerHTML = "";

  // Create dots for each slide
  slides.forEach((slide, index) => {
    const dot = document.createElement("span");
    dot.classList.add("slider-dot");
    if (index === 0) {
      dot.classList.add("active");
    }
    dot.addEventListener("click", () => {
      showSlide(slides, index);
      updateActiveDot(dotsContainer, index);
    });
    dotsContainer.appendChild(dot);
  });

  // Make sure the first slide is active
  showSlide(slides, 0);
}

function showSlide(slides, index) {
  slides.forEach((slide, i) => {
    if (i === index) {
      slide.classList.add("active");
    } else {
      slide.classList.remove("active");
    }
  });
}

function updateActiveDot(dotsContainer, index) {
  const dots = dotsContainer.querySelectorAll(".slider-dot");
  dots.forEach((dot, i) => {
    if (i === index) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
}

function openModal() {
  document.getElementById("addLocationModal").style.display = "block";
}

function closeModal() {
  document.getElementById("addLocationModal").style.display = "none";
}

let map;
let coords;
let count = 0;
let markers = [];

// Helper function to calculate distance between two coordinates in kilometers
function calculateDistance(pos1, pos2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((pos2.lat - pos1.lat) * Math.PI) / 180;
  const dLng = ((pos2.lng - pos1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pos1.lat * Math.PI) / 180) *
      Math.cos((pos2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper function to count common words between two strings
function countCommonWords(str1, str2) {
  // Split strings into arrays of words and convert to lowercase
  const words1 = str1
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const words2 = str2
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  // Count common words
  let commonCount = 0;
  for (const word1 of words1) {
    if (words2.includes(word1)) {
      commonCount++;
    }
  }

  return commonCount;
}

// Function to check if a new marker would be a duplicate
function isDuplicate(newPosition, newLabel) {
  for (const marker of markers) {
    const markerPos = marker.getPosition().toJSON();
    const distance = calculateDistance(markerPos, newPosition);

    // Check if within 3 kilometers
    if (distance <= 3) {
      // Get the existing marker's label
      let existingLabel = "";
      if (marker.labelText) {
        existingLabel = marker.labelText;
      }

      // Count common words
      const commonWords = countCommonWords(existingLabel, newLabel);

      // If 3 or more common words, it's a duplicate
      if (commonWords >= 3) {
        return true;
      }
    }
  }
  return false;
}

// Function to find corroborating reports within a certain distance
function findCorroboratingReports(position) {
  let count = 0;

  for (const marker of markers) {
    const markerPos = marker.getPosition().toJSON();
    const distance = calculateDistance(markerPos, position);

    // Consider reports within 1km as potentially corroborating
    if (distance <= 1) {
      count++;
    }
  }

  return count;
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 43.65824087578518, lng: -79.37912807238386 },
    // center: { lat: 43.650430055480776, lng: -79.38000407915196 },
    zoom: 17.5,
    mapTypeId: "hybrid",
    tilt: 0,
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [
          {
            visibility: "off",
          },
        ],
      },
      {
        featureType: "transit.station",
        elementType: "labels",
        stylers: [
          {
            visibility: "off",
          },
        ],
      },
    ],
  });

  map.addListener("click", function (event) {
    coords = event.latLng;
    openModal();
  });

  // Initialize the user credibility display
  updateUserCredibilityDisplay();
}

function showNotification(type, locationTitle) {
  let notificationContainer = document.getElementById("notificationContainer");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "notification-container";
    notificationContainer.style.position = "fixed";
    notificationContainer.style.top = "20px";
    notificationContainer.style.right = "20px";
    notificationContainer.style.zIndex = "1000";
    document.body.appendChild(notificationContainer);
  }
  // Create the notification element
  const notification = document.createElement("div");
  notification.classList.add("notification");

  // Set styles based on notification type
  if (type === "confirm") {
    notification.classList.add("notification-confirm");
    notification.innerHTML = `<strong>✅ Confirmed!</strong> Someone confirmed your location "${locationTitle}"`;
  } else if (type === "dispute") {
    notification.classList.add("notification-dispute");
    notification.innerHTML = `<strong>⛔ Disputed!</strong> Someone disputed your location "${locationTitle}"`;
  }

  // Style the notification
  notification.style.backgroundColor =
    type === "confirm" ? "#4CAF50" : "#f44336";
  notification.style.color = "white";
  notification.style.padding = "15px";
  notification.style.borderRadius = "4px";
  notification.style.marginBottom = "15px";
  notification.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  notification.style.position = "relative";
  notification.style.minWidth = "350px";
  notification.style.animation = "fadeIn 0.5s, fadeOut 0.5s 3.5s";
  notification.style.opacity = "0";

  // Add close button
  const closeBtn = document.createElement("span");
  closeBtn.innerHTML = "&times;";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "-5px";
  // closeBtn.style.right = "10px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "20px";
  closeBtn.onclick = function () {
    notification.remove();
  };
  notification.appendChild(closeBtn);

  // Add to container
  notificationContainer.appendChild(notification);

  // Add animation keyframes if not already added
  if (!document.getElementById("notification-keyframes")) {
    const style = document.createElement("style");
    style.id = "notification-keyframes";
    style.innerHTML = `
     @keyframes fadeIn {
       from {opacity: 0; transform: translateX(50px);}
       to {opacity: 1; transform: translateX(0);}
     }
     @keyframes fadeOut {
       from {opacity: 1; transform: translateX(0);}
       to {opacity: 0; transform: translateX(50px);}
     }
   `;
    document.head.appendChild(style);
  }

  // Animate in
  setTimeout(() => {
    notification.style.opacity = "1";
    notification.style.animation = "fadeIn 0.5s";
  }, 10);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = "fadeOut 0.5s forwards";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 4000);
}

document
  .getElementById("addLocationModal")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const label = document.getElementById("placeTitle").value;
    const description = document.getElementById("placeDescription").value;
    const files = document.getElementById("placeFiles").files;
    const email = document.getElementById("placeEmail").value;

    if (files.length > 5) {
      alert("You can only upload up to 5 files.");
      return;
    }

    // Check for duplicate locations
    const newPosition = {
      lat: coords.lat(),
      lng: coords.lng(),
    };

    if (isDuplicate(newPosition, label)) {
      alert(
        "A similar location already exists within 3 kilometers. Please choose a different location or title."
      );
      return;
    }

    count++;

    // Update user credibility stats
    userCredibility.totalReports++;
    userCredibility.totalPhotos += files.length;

    // Find any corroborating reports
    const corroboratingReports = findCorroboratingReports(newPosition);

    // Calculate this report's credibility score
    const reportCredibility = calculateReportCredibility(
      files.length,
      true, // Location is enabled
      corroboratingReports
    );

    // Store this report's score
    userCredibility.reportScores.push(reportCredibility);

    // Update the displayed user credibility
    updateUserCredibilityDisplay();

    const newPlaceContent = document.createElement("div");
    newPlaceContent.id = `place-${count}`;

    // Add report credibility display
    const credibilityElem = document.createElement("div");
    credibilityElem.classList.add("report-credibility");
    credibilityElem.textContent = `Report Credibility: ${reportCredibility}/100`;
    newPlaceContent.appendChild(credibilityElem);

    const descriptionElem = document.createElement("h2");
    descriptionElem.textContent = description;
    newPlaceContent.appendChild(descriptionElem);

    // Add coordinates display
    const coordsElem = document.createElement("p");
    coordsElem.classList.add("coordinates");
    coordsElem.textContent = `Location: ${coords.lat().toFixed(6)}, ${coords
      .lng()
      .toFixed(6)}`;
    newPlaceContent.appendChild(coordsElem);

    const slider = document.createElement("div");
    slider.classList.add("slider");

    Array.from(files).forEach((file, index) => {
      const mediaElement = document.createElement(
        file.type.startsWith("image") ? "img" : "video"
      );
      mediaElement.classList.add("slide");
      if (index === 0) {
        mediaElement.classList.add("active");
      }
      mediaElement.src = URL.createObjectURL(file);

      if (file.type.startsWith("video")) {
        mediaElement.controls = true;
      }

      slider.appendChild(mediaElement);
    });

    newPlaceContent.appendChild(slider);

    const sliderDots = document.createElement("div");
    sliderDots.classList.add("slider-dots");
    newPlaceContent.appendChild(sliderDots);

    // Create feedback buttons for report
    const feedbackDiv = document.createElement("div");
    feedbackDiv.classList.add("feedback-buttons");

    const likeBtn = document.createElement("button");
    likeBtn.textContent = "👍 Confirm";
    likeBtn.classList.add("like-btn");
    likeBtn.addEventListener("click", function () {
      // Update the report credibility
      const thisReportIndex = userCredibility.reportScores.length - 1;
      userCredibility.reportScores[thisReportIndex] = Math.min(
        100,
        userCredibility.reportScores[thisReportIndex] + 15
      );
      credibilityElem.textContent = `Report Credibility: ${userCredibility.reportScores[thisReportIndex]}/100`;
      updateUserCredibilityDisplay();

      showNotification("confirm", label);
    });

    const dislikeBtn = document.createElement("button");
    dislikeBtn.textContent = "👎 Dispute";
    dislikeBtn.classList.add("dislike-btn");
    dislikeBtn.addEventListener("click", function () {
      // Update the report credibility
      const thisReportIndex = userCredibility.reportScores.length - 1;
      userCredibility.reportScores[thisReportIndex] = Math.max(
        0,
        userCredibility.reportScores[thisReportIndex] - 15
      );
      credibilityElem.textContent = `Report Credibility: ${userCredibility.reportScores[thisReportIndex]}/100`;
      updateUserCredibilityDisplay();

      showNotification("dispute", label);
    });

    feedbackDiv.appendChild(likeBtn);
    feedbackDiv.appendChild(dislikeBtn);
    newPlaceContent.appendChild(feedbackDiv);

    // Create the InfoWindow content
    const infowindow = new google.maps.InfoWindow({
      content: newPlaceContent,
    });

    // Create the marker
    const marker = new google.maps.Marker({
      position: coords,
      map,
      icon: {
        url: "img/marker.png",
        labelOrigin: new google.maps.Point(15, 50),
      },
    });

    // Store additional data on the marker
    marker.labelText = label;
    marker.reportCredibility = reportCredibility;
    marker.coordinates = {
      lat: coords.lat(),
      lng: coords.lng(),
    };

    marker.addListener("mouseover", function () {
      marker.setLabel({
        text: label,
        fontSize: "14px",
        fontWeight: "bold",
        fontFamily: "Poppins",
        className: "label",
      });
    });

    marker.addListener("mouseout", function () {
      marker.setLabel({
        text: " ",
      });
    });

    marker.addListener("click", function () {
      infowindow.open(map, marker);
      marker.setIcon({
        url: "img/darkerMarker.png",
        labelOrigin: new google.maps.Point(15, 50),
      });
    });

    markers.push(marker);
    window.mapMarkers = markers; // if you need global access

    closeModal();
    document.getElementById("addPlaceForm").reset();

    if (slider.children.length >= 1) {
      // Call dotCheck directly, passing the specific container
      dotCheck(newPlaceContent);
    }
  });

window.initMap = initMap;
