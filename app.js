// Mobile nav toggle & active tab handling
const navToggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');
const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();
if (navToggle && nav){
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}
// Smooth scroll & active state
const links = document.querySelectorAll('.nav-link');
const setActive = (id) => { links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id)); };
links.forEach(link => { link.addEventListener('click', () => {
  if (nav.classList.contains('open')) { nav.classList.remove('open'); navToggle.setAttribute('aria-expanded', 'false'); }
  const targetId = link.getAttribute('href').slice(1); setActive(targetId);
}); });
const sections = document.querySelectorAll('main section[id]');
const obs = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting){ setActive(entry.target.id); } }); }, { rootMargin:'-40% 0px -55% 0px', threshold:0.01 });
sections.forEach(sec => obs.observe(sec));

// Contact form
const form = document.querySelector('.contact-form');
if (form){
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    alert(`Thanks, ${data.name || 'there'}! We'll reach out at ${data.email || 'your email'} within 1 business day.`);
    form.reset();
  });
}

// Lightbox
const lightbox = document.querySelector('[data-lightbox]');
const lightboxImg = document.querySelector('.lightbox-img');
const lightboxCaption = document.querySelector('.lightbox-caption');
const openLightbox = (src, caption = '') => {
  if (!lightbox) return;
  lightboxImg.src = src; lightboxCaption.textContent = caption;
  lightbox.removeAttribute('hidden'); document.body.style.overflow = 'hidden';
};
const closeLightbox = () => {
  if (!lightbox) return;
  lightbox.setAttribute('hidden', ''); lightboxImg.src = ''; lightboxCaption.textContent = '';
  document.body.style.overflow = '';
};
if (lightbox){
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-close')) closeLightbox();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lightbox.hasAttribute('hidden')) closeLightbox(); });
}
document.addEventListener('click', (e) => {
  const img = e.target.closest('.gallery .thumb img');
  if (img){
    const full = img.getAttribute('data-full') || img.src;
    const caption = img.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || '';
    openLightbox(full, caption);
  }
});
