# UCT MEC4128Z Project Browser

A lightweight web application intended to serve project offerings for the MEC4128Z 
Final-Year Project course. This web app is served by GitHub Pages and consumes 
project data as a JSON array served from a Google Apps Script API backend.

---

## Overview

This web app provides students with an interactive interface to explore project 
options, currently the web app supports:

* Full-text searching
* Multi-select filtering
* Client-side caching of project list 
* Project and preference selection
* Exporting project selection and preferences to a CSV file
* Exporting selected project descriptions to a markdown file

---

## JSON Format

The following is the expected format of the JSON array ingested by the browser:

```json
[
  {
    "id": "001",
    "title": "Project Title",
    "supervisor": "Dr Foo Bar",
    "co_supervisor": {
      "exists": true,
      "name": "Prof John Doe"
    },
    "project": {
      "brief": "Short description...",
      "capacity": 2,
      "assigned_student": ["Alice Brown"],
      "keywords": ["calibration", "algorithms"],
      "prerequisites": ["MEC4124W"],
      "field": "Control, Robotics & Mechatronics"
    }
  }
]
```

The `id` field must be a zero padded string, while `keywords`, `prerequisites` and `assigned_student` should be arrays. Empty values may be `""` or `[]`. If the Google Apps Script could not access form response sheet the following response is expected:

```json
{ "error": "Could not collect form responses." }
```

---

## Supported Features

1. Project Filter through the use of drop down filters:
    * Primary Field Filter
    * Keywords
    * Supervisor
2. Text based searching through the following fields:
    * Project title
    * Supervisor name
    * Project description
    * Keywords
3. Client side caching of project list
4. Project selection via clicking project card
5. Preference selection via drop down list once selected
6. Exporting project preference to CSV file
7. Project availability validation before exporting
8. View controls for showing selected or non-selected projects
9. Exporting selected project description as a markdown file.

---

## Serving in a Brightspace page

To serve the project browser in from a GitHub page into a Brightspace page, use
the following example:

```
<iframe
  src="https://yourusername.github.io/your-repo/"
  width="100%"
  height="800"
  frameborder="0"
  allowfullscreen>
</iframe>
```
