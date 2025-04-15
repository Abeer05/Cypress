// button.addEventListener("click", () => {
//   button.classList.add("hidden");
// });

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

  // alert(markers[30].label);

  // const existingMarkers = [
  //   {
  //     position: { lat: 43.65824087578518, lng: -79.37912807238386 },
  //     label: "TMU",
  //     content: document.getElementById("TMU"),
  //   },
  // ];

  // count = markers.length;

  map.addListener("click", function (event) {
    coords = event.latLng;
    openModal();
  });

  // map.addListener("zoom_changed", () => {
  //   const currentZoom = map.getZoom();
  //   const zoomThreshold = 14;

  //   window.mapMarkers.forEach((marker) => {
  //     if (currentZoom < zoomThreshold) {
  //       marker.setMap(null);
  //     } else {
  //       marker.setMap(map);
  //     }
  //   });
  // });
}

document
  .getElementById("addLocationModal")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const label = document.getElementById("placeTitle").value;
    const description = document.getElementById("placeDescription").value;
    const files = document.getElementById("placeFiles").files;

    if (files.length > 5) {
      alert("You can only upload up to 5 files.");
      return;
    }

    count++;

    const newPlaceContent = document.createElement("div");
    newPlaceContent.id = `place-${count}`;

    const descriptionElem = document.createElement("h2");
    descriptionElem.textContent = description;
    newPlaceContent.appendChild(descriptionElem);

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
