export function bsCssColors(): string {
  return /* HTML */ `
    <style>
      :root {
        --bs-body-bg: #ffffff;
        --bs-primary: #7397c3;
        --bs-primary-rgb: 115, 151, 195;
      }

      .btn-primary {
        --bs-btn-bg: var(--bs-primary);
        --bs-btn-border-color: var(--bs-primary);
        --bs-btn-hover-bg: #415f8a;
        --bs-btn-active-bg: #415f8a;
        --bs-btn-active-border-color: #415f8a;
        --bs-btn-disabled-bg: #a9d3ff;
        --bs-btn-disabled-color: #415f8a;
        --bs-btn-disabled-border-color: #a9d3ff;
      }

      /* Google Sign-In button width fix */
      .g_id_signin {
        width: 222px;
      }
    </style>
  `;
}

export function bsCssCDNLinks(): string {
  return /* HTML */ `
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
      integrity="sha256-2FMn2Zx6PuH5tdBQDRNwrOo60ts5wWPC9R8jK67b3t4="
      crossorigin="anonymous"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css"
      integrity="sha256-pdY4ejLKO67E0CM2tbPtq1DJ3VGDVVdqAR6j3ZwdiE4="
      crossorigin="anonymous"
    />
  `;
}

export function bsJSCDNLinks(): string {
  return /* HTML */ `
    <script
      src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"
      integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
      crossorigin="anonymous"
    ></script>
    <script
      src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.min.js"
      integrity="sha256-YMa+wAM6QkVyz999odX7lPRxkoYAan8suedu4k2Zur8="
      crossorigin="anonymous"
    ></script>
  `;
}
