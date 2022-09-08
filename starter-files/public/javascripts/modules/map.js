import axios from "axios";
import { $ } from "./bling";

const mapOptions = {
  center: { lat: 43.25, lng: -79.85 },
  zoom: 12,
};

function loadPlaces(map, lat = 43.2, lng = -79.8) {
  axios
    .get(`/api/stores/near`, {
      params: { lat, lng },
    })
    .then((res) => {
      const places = res.data;
      if (!places.length) {
        return alert("No places found");
      }

      // create a bound
      const bounds = new google.maps.LatLngBounds();
      const infoWindow = new google.maps.InfoWindow();

      const markers = places.map((place) => {
        const [placeLng, placeLat] = place.location.coordinates;
        const position = { lat: placeLat, lng: placeLng };
        bounds.extend(position);
        const marker = new google.maps.Marker({ map, position });
        marker.place = place;
        return marker;
      });

      // when someone clicks on a marker, show the details of that place
      markers.forEach((marker) =>
        marker.addListener("click", function () {
          console.log(this.place);
          const html = `
                <div class="popup">
                  <a href="/store/${this.place.slug}">
                    <img src="/uploads/${
                      this.place.photo || "store.png"
                    }" alt="${this.place.name}" />
                    <p>${this.place.name} - ${this.place.location.address}</p>
                  </a>
                </div>
              `;

          infoWindow.setContent(html);
          infoWindow.open({
            anchor: marker,
            map,
            shouldFocus: false,
          });
        })
      );

      // then zoom the map to fit all the markers perfectly
      map.setCenter(bounds?.getCenter());
      map.fitBounds(bounds);
    });
}

function makeMap(mapDiv) {
  if (!mapDiv) {
    return;
  }

  // Make our map
  const map = new google.maps.Map(mapDiv, mapOptions);
  const input = $(`[name="geolocate"]`);
  loadPlaces(map);

  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    console.log(place);
    loadPlaces(
      map,
      place.geometry.location.lat(),
      place.geometry.location.lng()
    );
  });
}

export default makeMap;
