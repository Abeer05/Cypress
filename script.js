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

function getTagCategory(tag) {
  const roadDamageTags = ["Pothole", "Cracked Pavement", "Faded Lane Markings"];
  const publicSafetyTags = [
    "Street Light",
    "Broken Sidewalk",
    "Obstructed Crosswalk",
  ];
  const infrastructureTags = [
    "Leaking Hydrant",
    "Manhole Cover Issue",
    "Traffic Light Malfunction",
  ];
  const environmentalTags = ["Garbage", "Tree Hazard", "Illegal Dumping"];

  if (roadDamageTags.includes(tag)) return "Road Damage";
  if (publicSafetyTags.includes(tag)) return "Public Safety";
  if (infrastructureTags.includes(tag)) return "Infrastructure";
  if (environmentalTags.includes(tag)) return "Environmental";

  return "default";
}

// Function to show notification in the top right
function showNotification(
  type,
  locationTitle,
  reportId = count,
  userCredibilityScore = calculateOverallCredibility(),
  timestamp = Date.now()
) {
  // Create notification container if it doesn't exist
  let notificationContainer = document.getElementById("notification-container");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "notification-container";
    notificationContainer.style.position = "fixed";
    notificationContainer.style.top = "20px";
    notificationContainer.style.right = "20px";
    notificationContainer.style.zIndex = "1000";
    document.body.appendChild(notificationContainer);
  }

  // Format timestamp
  const formattedTime = new Date(timestamp).toLocaleString();

  // Create the notification element
  const notification = document.createElement("div");
  notification.classList.add("notification");
  notification.dataset.reportId = reportId;
  notification.dataset.type = type;
  notification.dataset.credibility = userCredibilityScore;
  notification.dataset.timestamp = timestamp;
  notification.dataset.title = locationTitle;

  // Set styles based on notification type
  if (type === "confirm") {
    notification.classList.add("notification-confirm");
    notification.innerHTML = `<strong>✅ Confirmed!</strong> Your location "${locationTitle}" was confirmed`;
  } else if (type === "dispute") {
    notification.classList.add("notification-dispute");
    notification.innerHTML = `<strong>❌ Disputed!</strong> Your location "${locationTitle}" was disputed`;
  }

  // Make it look clickable
  notification.style.cursor = "pointer";

  // Style the notification
  notification.style.backgroundColor =
    type === "confirm" ? "#4CAF50" : "#f44336";
  notification.style.color = "white";
  notification.style.padding = "16px";
  notification.style.borderRadius = "4px";
  notification.style.marginBottom = "15px";
  notification.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  notification.style.position = "relative";
  notification.style.minWidth = "300px";
  notification.style.animation = "fadeIn 0.5s, fadeOut 0.5s 5.5s";
  notification.style.opacity = "0";

  // Add "Click for details" text
  const detailsText = document.createElement("div");
  detailsText.textContent = "Click for details";
  detailsText.style.fontSize = "12px";
  detailsText.style.marginTop = "5px";
  notification.appendChild(detailsText);

  // Add close button
  const closeBtn = document.createElement("span");
  closeBtn.innerHTML = "&times;";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "-5px";
  closeBtn.style.right = "0px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "20px";
  closeBtn.onclick = function (e) {
    e.stopPropagation(); // Prevent triggering the notification click
    notification.remove();
  };
  notification.appendChild(closeBtn);

  // Add click event to show detailed report
  notification.addEventListener("click", function () {
    showDetailedReport(
      this.dataset.type,
      this.dataset.title,
      this.dataset.reportId,
      this.dataset.credibility,
      this.dataset.timestamp
    );
  });

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

  // Auto-remove after 6 seconds
  setTimeout(() => {
    notification.style.animation = "fadeOut 0.5s forwards";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 6000);
}

function showDetailedReport(
  type,
  locationTitle,
  reportId,
  userCredibilityScore,
  timestamp
) {
  // Create modal backdrop
  const backdrop = document.createElement("div");
  backdrop.id = "report-backdrop";
  backdrop.style.position = "fixed";
  backdrop.style.top = "0";
  backdrop.style.left = "0";
  backdrop.style.width = "100%";
  backdrop.style.height = "100%";
  backdrop.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  backdrop.style.display = "flex";
  backdrop.style.justifyContent = "center";
  backdrop.style.alignItems = "center";
  backdrop.style.zIndex = "2000";

  // Format timestamp
  const formattedTime = new Date(parseInt(timestamp)).toLocaleString();

  // Create report container
  const reportContainer = document.createElement("div");
  reportContainer.classList.add("report-detail-container");
  reportContainer.style.backgroundColor = "white";
  reportContainer.style.borderRadius = "8px";
  reportContainer.style.padding = "25px";
  reportContainer.style.minWidth = "500px";
  reportContainer.style.maxWidth = "800px";
  reportContainer.style.maxHeight = "80vh";
  reportContainer.style.overflowY = "auto";
  reportContainer.style.position = "relative";
  reportContainer.style.fontFamily = "Poppins, sans-serif";

  // Create header with action type
  const header = document.createElement("h2");
  header.textContent =
    type === "confirm" ? "Report Confirmed" : "Report Disputed";
  header.style.borderBottom =
    "2px solid " + (type === "confirm" ? "#4CAF50" : "#f44336");
  header.style.paddingBottom = "10px";
  header.style.color = type === "confirm" ? "#4CAF50" : "#f44336";
  header.style.textAlign = "center";
  reportContainer.appendChild(header);

  // Create report details
  const detailsContainer = document.createElement("div");
  detailsContainer.style.marginTop = "20px";

  // Location title
  const titleDetail = document.createElement("div");
  titleDetail.innerHTML = `<strong>Location:</strong> ${locationTitle}`;
  titleDetail.style.marginBottom = "10px";
  titleDetail.style.fontSize = "18px";
  detailsContainer.appendChild(titleDetail);

  // Report ID
  const idDetail = document.createElement("div");
  idDetail.innerHTML = `<strong>Report ID:</strong> ${reportId}`;
  idDetail.style.marginBottom = "10px";
  detailsContainer.appendChild(idDetail);

  // User credibility
  const credibilityDetail = document.createElement("div");
  credibilityDetail.innerHTML = `<strong>User Credibility:</strong> ${userCredibilityScore}/100`;
  credibilityDetail.style.marginBottom = "10px";

  // Add visual indicator for credibility
  const credBar = document.createElement("div");
  credBar.style.height = "10px";
  credBar.style.width = "100%";
  credBar.style.backgroundColor = "#e0e0e0";
  credBar.style.borderRadius = "5px";
  credBar.style.marginTop = "5px";

  const credFill = document.createElement("div");
  credFill.style.height = "100%";
  credFill.style.width = `${userCredibilityScore}%`;
  credFill.style.backgroundColor =
    userCredibilityScore >= 80
      ? "#4CAF50"
      : userCredibilityScore >= 50
      ? "#FF9800"
      : "#f44336";
  credFill.style.borderRadius = "5px";
  credFill.style.transition = "width 1s ease-in-out";

  credBar.appendChild(credFill);
  credibilityDetail.appendChild(credBar);
  detailsContainer.appendChild(credibilityDetail);

  // Timestamp
  const timeDetail = document.createElement("div");
  timeDetail.innerHTML = `<strong>Time:</strong> ${formattedTime}`;
  timeDetail.style.marginBottom = "10px";
  detailsContainer.appendChild(timeDetail);

  // Action taken
  const actionDetail = document.createElement("div");
  actionDetail.innerHTML = `<strong>Action:</strong> ${
    type === "confirm" ? "Confirmed ✅" : "Disputed ❌"
  }`;
  actionDetail.style.marginBottom = "20px";
  detailsContainer.appendChild(actionDetail);

  // Impact on credibility
  const impactDetail = document.createElement("div");
  impactDetail.innerHTML = `<strong>Impact on Your Report's Credibility:</strong> ${
    type === "confirm" ? "+15 points" : "-15 points"
  }`;
  impactDetail.style.color = type === "confirm" ? "#4CAF50" : "#f44336";
  impactDetail.style.fontWeight = "bold";
  detailsContainer.appendChild(impactDetail);

  reportContainer.appendChild(detailsContainer);

  // Add close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.padding = "10px 20px";
  closeBtn.style.backgroundColor = "#007bff";
  closeBtn.style.color = "white";
  closeBtn.style.border = "none";
  closeBtn.style.borderRadius = "4px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.marginTop = "20px";
  closeBtn.style.display = "block";
  closeBtn.style.margin = "20px auto 0";
  closeBtn.style.fontFamily = "Poppins, sans-serif";

  closeBtn.addEventListener("click", function () {
    document.body.removeChild(backdrop);
  });

  reportContainer.appendChild(closeBtn);

  // Add X in the corner
  const cornerClose = document.createElement("span");
  cornerClose.innerHTML = "&times;";
  cornerClose.style.position = "absolute";
  cornerClose.style.top = "10px";
  cornerClose.style.right = "15px";
  cornerClose.style.fontSize = "24px";
  cornerClose.style.cursor = "pointer";
  cornerClose.style.color = "#666";

  cornerClose.addEventListener("click", function () {
    document.body.removeChild(backdrop);
  });

  reportContainer.appendChild(cornerClose);

  // Append everything to the backdrop and add to body
  backdrop.appendChild(reportContainer);
  document.body.appendChild(backdrop);
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 43.65824087578518, lng: -79.37912807238386 },
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

  // Add form submit event listener
  document
    .getElementById("addPlaceForm")
    .addEventListener("submit", handleFormSubmit);
}

function handleFormSubmit(event) {
  event.preventDefault();

  const label = document.getElementById("placeTitle").value;
  const description = document.getElementById("placeDescription").value;
  const selectedOptions = Array.from(
    document.getElementById("placeTags").selectedOptions
  );
  const tags = selectedOptions.map((option) => option.value);

  const files = document.getElementById("placeFiles").files;

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
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = `
    <div class="info-window" id="place-${count}">
      <h3>${label}</h3>
      <p>${description}</p>
      <div><strong>Tags:</strong> ${tags.join(", ")}</div>
      <div class="comments-section">
        <h4>Comments & Updates</h4>
        <ul class="comments-list" id="comments-${count}"></ul>
      </div>
      <button onclick="openCommentForm(${count})" class="comment-button">💬 Add Comment</button>
      <div id="comment-form-${count}" class="comment-form" style="display:none;">
        <textarea id="comment-text-${count}" placeholder="Write your comment..." rows="3"></textarea>
        <input type="text" id="comment-tags-${count}" placeholder="Tags (comma-separated)">
        <button onclick="submitComment(${count})">Submit</button>
      </div>
    </div>
  `;

  const newPlaceContent = tempDiv.firstElementChild;

  // Add report credibility display
  const credibilityElem = document.createElement("div");
  credibilityElem.classList.add("report-credibility");
  credibilityElem.textContent = `Report Credibility: ${reportCredibility}/100`;
  newPlaceContent.appendChild(credibilityElem);

  // Add tags to the report
  tags.forEach((tag) => {
    const tagElem = document.createElement("div");
    tagElem.classList.add("report-tag");
    tagElem.textContent = tag;
    tagElem.setAttribute("data-category", getTagCategory(tag));
    newPlaceContent.appendChild(tagElem);
  });

  // Then add the description
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

    // Also update user's base score
    userCredibility.baseScore = Math.min(100, userCredibility.baseScore + 5);

    // Update displays
    updateUserCredibilityDisplay();

    // Show notification
    showNotification("confirm", label, count);
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

    // Also update user's base score
    userCredibility.baseScore = Math.max(0, userCredibility.baseScore - 5);

    // Update displays
    updateUserCredibilityDisplay();

    // Show notification
    showNotification("dispute", label, count);
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
  marker.comments = [];
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

  function openCommentForm(id) {
    document.getElementById(`comment-form-${id}`).style.display = "block";
  }

  function submitComment(id) {
    const text = document.getElementById(`comment-text-${id}`).value;
    const tagInput = document.getElementById(`comment-tags-${id}`).value;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (!text) return;

    // Find the correct marker using the id (assumes count = index of marker)
    const marker = markers[id - 1]; // adjust if your indexing differs
    const comment = { text, tags, timestamp: new Date().toLocaleString() };

    marker.comments.push(comment);

    // Append comment to UI
    const commentList = document.getElementById(`comments-${id}`);
    const commentHTML = `
      <li>
        <p>${text}</p>
        <small>${comment.timestamp}</small><br/>
        <em>Tags: ${tags.join(", ")}</em>
      </li>
    `;
    commentList.insertAdjacentHTML("beforeend", commentHTML);

    // Clear form
    document.getElementById(`comment-text-${id}`).value = "";
    document.getElementById(`comment-tags-${id}`).value = "";
    document.getElementById(`comment-form-${id}`).style.display = "none";
  }

  window.mapMarkers = markers; // if you need global access

  closeModal();
  document.getElementById("addPlaceForm").reset();

  if (slider.children.length >= 1) {
    // Call dotCheck directly, passing the specific container
    dotCheck(newPlaceContent);
  }
}

window.initMap = initMap;
