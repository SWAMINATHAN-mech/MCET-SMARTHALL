# MCET Smart Hall & Venue Availability Management System

Dr. Mahalingam College of Engineering and Technology, Pollachi

## Project layout
```
mcet_venue/
├── app.py            # Flask app: database, booking rules, routes
├── requirements.txt
├── templates/        # Jinja2 HTML pages
└── static/           # style.css, app.js, logo, campus photo, favicon
```

## Run in VS Code
1. Install Python 3.10+ (on Windows tick "Add Python to PATH").
2. Open this folder in VS Code, then in the terminal:
   ```
   pip install -r requirements.txt
   python app.py
   ```
3. Open http://127.0.0.1:5000

On first run `mcet_venue.db` is created with sample venues, bookings and demo logins:

| Role | Login | Password |
|---|---|---|
| Admin | `admin` | `admin@123` |
| Hall Supervisor | `sup-cse` | `super@123` |
| Student | `student` | `student@123` |

The Student login accepts only the ID `student` — any other ID shows “You do not have access to this website.” Change these passwords after signing in (🔑 in the top bar).

Booking times are picked on a 12-hour clock (hour : minute AM/PM). Purpose and Requirements are separate fields on the request form and the booking page. To start fresh, stop the app, delete `mcet_venue.db` and run again.
