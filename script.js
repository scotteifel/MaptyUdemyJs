'use strict';
class Workout {
  date = new Date();

  id = (Date.now() + '').slice(-10);
  clicks = 1;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  };
  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)}
      on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  };
};

class Running extends Workout {
  type = 'running'

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  };

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  };
};

class Cycling extends Workout {
  type = 'cycling'

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevation = elevationGain;
    this.calcSpeed();
    this._setDescription();
  };

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  };
};

/////////////////////////////
// APPLICATION ARCHITECURE //
/////////////////////////////

const containerWorkouts = document.querySelector('.workouts');
const deleteWorkoutButton = document.querySelector('.workout__delete');
const editDistance = document.querySelector('.workout__edit--distance');
const form = document.querySelector('.form');
const inputCadence = document.querySelector('.form__input--cadence');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputElevation = document.querySelector('.form__input--elevation');
const inputType = document.querySelector('.form__input--type');

class App {
  #workouts = [];
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #popups = [];

  constructor() {
    // Get the users position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._beginEdit.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this))
  };

  _allPositive(...inputs) { inputs.every(inp => inp > 0) };
  _validInputs(...inputs) { inputs.every(inp => Number.isFinite(inp)) };

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
      function() {
        alert(`Couldn't get your position.`);
      });
    };

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyr\
      ight">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work)
    });
  };

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  };

  _hideForm() {
    // Empty the inputs
    inputDistance.value = inputCadence.value =
    inputElevation.value = inputDuration.value = '';

    // Make the new workout replace the form space instantly and hide the form
    form.style.display = `none`;
    form.classList.add('hidden');
    setTimeout(() => form.style.display = 'grid', 1000);
  };

  _toggleElevationField() {
      inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
      inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  };

  _validateFields(inputs) {
    // Inputs must be positive numbers or returns false
    if (!inputs.every(inp => inp > 0) ||
    !inputs.every(inp => Number.isFinite(inp))) return false
  }

  _newWorkout(e) {
    e.preventDefault()

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Create a running object
    if(type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if( this._validateFields([distance,duration,cadence]) === false)
        return alert('Inputs have to be positive numbers.');

      workout = new Running([lat, lng], distance, duration, cadence);
    };

    // Create a cycling object
    if(type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if( this._validateFields([distance,duration,elevation]) === false)
        return alert('Inputs have to be positive numbers.');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    };

    // Add new object to workout array
    this.#workouts.push(workout)

    // Display the marker
    this._renderWorkoutMarker(workout);

    // Render the workout on the list
    this._renderWorkout(workout)

    // Clear the input form
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  };

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`,
      }))
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴'} ${workout.description}`
      )
      .openPopup();
    this.#popups.push(marker)
  };

  // Render workout on map as marker
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id='${workout.id}'>
        <h2 class="workout__title">${workout.description}
        <button type="button" class ="workout__delete tooltip" title="Delete workout">🗑️</button>
        </h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type==='running'?'🏃‍':'🚴'}
            </span>
          <span class="workout__value  workout__value--distance
            workout__value--edit tooltip" title="Edit field">
            ${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value  workout__value--time
            workout__value--edit tooltip" title="Edit field">
            ${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if(workout.type === 'running')
          html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value workout__value--pace">
                ${workout.pace.toFixed(1)}
                </span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value workout__value--edit
                workout__value--cadence tooltip" title="Edit field">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
          </li>
          `;

      if(workout.type === 'cycling')
            html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value workout__value--pace">
                ${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⛰</span>
              <span class="workout__value workout__value--edit
                workout__value--elevation tooltip" title="Edit field">${workout.elevation}</span>
              <span class="workout__unit">m</span>
            </div>
          </li>
            `;

      this._renderSortAndDeleteOptions()
      form.insertAdjacentHTML('afterend', html);
  };

  _renderSortAndDeleteOptions(e) {
    console.log('sort option ran');
    if(document.querySelector('.workout__sort') ||
    document.querySelectorAll('.workout').length < 1) return;

    const htmlSort = `
    <div class="dropdown workout__sort">
      <button class="dropbtn btn__sort"> Sort </button>
      <div class="dropdown-content">
        <a href="#">Running</a>
        <a href="#">Cycling</a>
      </div>
    </div>
    `;

    const htmlDelete = `
    <div class="workout__delete--all">
      <button type="button" class="btn__delete--all">
      <span class="tooltip" title="Clear all workouts">Clear all</span>
      </button>
    </div>
    `;

  containerWorkouts.insertAdjacentHTML('beforebegin', htmlSort);
  document.querySelector('.btn__sort').addEventListener(
    'click', this._sortWorkouts.bind(this));

  containerWorkouts.insertAdjacentHTML('beforeend', htmlDelete);
  document.querySelector('.btn__delete--all').addEventListener(
    'click', this._deleteAllWorkouts.bind(this));
  }

  _sortWorkouts(e) {
    console.log();
  }

  _deleteWorkout(e) {
    e.stopPropagation()

    if (!e.target.classList.contains('workout__delete')) {
      return;
    }

    const workoutEl = e.target.closest('.workout');
    const id = workoutEl.getAttribute('data-id')
    let pos;

    // Find the index of the element to delete
    this.#workouts.forEach(function(workout, i) {
      if(workout.id === id) {
        pos = i;
      };
    });

    // Remove the popup from the map
    this.#map.removeLayer(this.#popups[pos]);
    this.#popups.splice(pos, 1);

    // Remove the workout from the workouts array, local storage, and DOM
    workoutEl.remove();
    this.#workouts.splice(pos, 1);
    this._refreshLocalStorage()
  };

  _deleteAllWorkouts(e) {
    document.querySelectorAll('.workout').forEach((work, i) => {
      work.remove()
      this.#map.removeLayer(this.#popups[i]);
    });

    this.#popups = []
    this.#workouts = []
    this._refreshLocalStorage()
    document.querySelector('.workout__delete--all').remove()
    document.querySelector('.workout__sort').remove()
  };

  _beginEdit(e) {
    if (e.target.classList.contains('form__edit')) return;
    const field = e.target.closest('.workout__value--edit');
    if (!field) return;

    //Properly label html class
    const checkField = function() {
      if (field.classList.contains('workout__value--time')) {
        return 'time';
      } else if (field.classList.contains('workout__value--distance')) {
        return 'distance';
      } else if (field.classList.contains('workout__value--cadence')) {
        return 'cadence';
      } else {
        return 'elevation';
      };
    };

    const html = `
      <input type=text maxlength=4
      class="form__edit form__edit--${checkField()}">
    `

    field.insertAdjacentHTML('beforebegin', html);
    const editEl = containerWorkouts.querySelector('.form__edit');
    editEl.value = e.target.textContent.trim()
    editEl.focus();
    editEl.originalValue = e.target.innerText
    e.target.textContent = ''

    editEl.addEventListener('change', this._completeEdit.bind(this));
    editEl.addEventListener('submit', this._completeEdit.bind(this));
    // editEl.addEventListener('change', this._cancelEdit.bind(this));
    editEl.addEventListener('blur', this._cancelEdit.bind(this));
  };

  _completeEdit(e) {
    e.preventDefault()
    let newVal = e.target.value;
    
    const targetClasses = e.target.classList;
    const workoutEl = document.querySelector('.form__edit').closest('.workout');
    const workoutId = workoutEl.getAttribute('data-id');
    
    if (!workoutId) return;
    const workout = this.#workouts.find(work => work.id === workoutId);
    
    // Check if data is valid
    if( this._validateFields([+newVal]) === false
    ) {
      newVal = e.target.originalValue
      alert('Inputs have to be positive numbers.');
      this._cancelEdit(e)
    };
    // workoutEl.removeEventListener('blur', this._cancelEdit.bind(this));
    // set originalvalue to the new value before cancel edit func runs.
    e.target.originalValue = newVal

    if (targetClasses.contains('form__edit--distance')) {
      workout.distance = newVal;
      workoutEl.querySelector('.workout__value--distance').textContent = newVal;

      } else if (targetClasses.contains('form__edit--time')) {

        workout.duration = newVal;
        workoutEl.querySelector('.workout__value--time').textContent = workout.duration;

      } else if (targetClasses.contains('form__edit--elevation')) {
        // Update a cycling elevation
        workout.elevation = newVal;
        workoutEl.querySelector('.workout__value--elevation').textContent =
        workout.elevation;
      
      } else {
        // Update a running cadence
        workout.cadence = newVal;
        workoutEl.querySelector('.workout__value--cadence').textContent =
        workout.cadence;
      };

    if (workout.type === 'running') {
      workout.pace = workout.duration / workout.distance;
      workoutEl.querySelector('.workout__value--pace').textContent =
        workout.pace.toFixed(1);

    } else {
        workout.speed = workout.distance / (workout.duration / 60);
        workoutEl.querySelector('.workout__value--pace').textContent =
        workout.speed.toFixed(1);
    };

    this._refreshLocalStorage();
    if (e.target.classList.contains('form__edit')) {
      containerWorkouts.querySelector('.form__edit').remove()
    }
  };
  
  _cancelEdit(e) {
    const editEl = containerWorkouts.querySelector('.form__edit')
    const editValue = e.target.originalValue
    const originalValueEl = editEl.parentElement.querySelector('.workout__value')

    // Js uses blur by default twice because it is set in an Event Handler,
    // the if statement catches it and runs the function properly
    if (e.relatedTarget || e.target.classList.contains('form__edit')) {
      if (editValue !== 0) {
        originalValueEl.textContent = editValue
        editEl.remove();
        return;

      } else {
        // This resets the original value if edit box is exited while empty
        originalValueEl.textContent = originalValueEl
        editEl.remove();
      };
    };
  };

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl || e.target.classList.contains('workout__delete')) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1
      }
    });
  };

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  };

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data;
    this._drawAllWorkouts()
  };

  _refreshLocalStorage() {
    localStorage.removeItem('workouts');
    this._setLocalStorage();
  }

  _drawAllWorkouts() {
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
};

const app = new App();
