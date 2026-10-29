// ---------- DOM references ----------
const form = document.getElementById('student-form');
const idInput = document.getElementById('student-id');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const ageInput = document.getElementById('age');
const courseSelect = document.getElementById('course');
const formTitle = document.getElementById('form-title');
const cancelBtn = document.getElementById('cancel-btn');
const rows = document.getElementById('student-rows');
const emptyMsg = document.getElementById('empty');
const countBadge = document.getElementById('count');
const searchInput = document.getElementById('search');
const toast = document.getElementById('toast');

let students = [];

// ---------- API helper ----------
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---------- UI helpers ----------
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function setError(input, field, message) {
  input.classList.toggle('invalid', Boolean(message));
  form.querySelector(`.error[data-for="${field}"]`).textContent = message || '';
}

// ---------- Client-side validation ----------
function validate() {
  let ok = true;
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const age = Number(ageInput.value);

  if (name.length < 2) { setError(nameInput, 'name', 'Enter at least 2 characters'); ok = false; }
  else setError(nameInput, 'name');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(emailInput, 'email', 'Enter a valid email'); ok = false; }
  else setError(emailInput, 'email');

  if (!Number.isInteger(age) || age < 10 || age > 100) { setError(ageInput, 'age', 'Age must be 10–100'); ok = false; }
  else setError(ageInput, 'age');

  if (!courseSelect.value) { setError(courseSelect, 'course', 'Pick a course'); ok = false; }
  else setError(courseSelect, 'course');

  return ok;
}

// ---------- Rendering ----------
function render() {
  rows.innerHTML = students
    .map((s) => `
      <tr>
        <td>${s.id}</td>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.email)}</td>
        <td>${s.age}</td>
        <td>${escapeHtml(s.course)}</td>
        <td>
          <button class="btn small" data-action="edit" data-id="${s.id}">Edit</button>
          <button class="btn small danger" data-action="delete" data-id="${s.id}">Delete</button>
        </td>
      </tr>`)
    .join('');
  emptyMsg.hidden = students.length > 0;
  countBadge.textContent = `${students.length} student${students.length === 1 ? '' : 's'}`;
}

// ---------- Data loading ----------
async function loadCourses() {
  const courses = await api('/api/courses');
  courseSelect.innerHTML =
    '<option value="">-- Select course --</option>' +
    courses.map((c) => `<option value="${c.id}">${escapeHtml(c.name)} (${c.duration} mo)</option>`).join('');
}

async function loadStudents() {
  const q = encodeURIComponent(searchInput.value.trim());
  students = await api(`/api/students?q=${q}`);
  render();
}

// ---------- Form mode (add vs edit) ----------
function resetForm() {
  form.reset();
  idInput.value = '';
  formTitle.textContent = 'Add Student';
  cancelBtn.hidden = true;
  ['name', 'email', 'age', 'course'].forEach((f) =>
    setError(document.getElementById(f), f));
}

function startEdit(student) {
  idInput.value = student.id;
  nameInput.value = student.name;
  emailInput.value = student.email;
  ageInput.value = student.age;
  courseSelect.value = student.course_id;
  formTitle.textContent = `Edit Student #${student.id}`;
  cancelBtn.hidden = false;
  nameInput.focus();
}

// ---------- Events ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    age: Number(ageInput.value),
    course_id: Number(courseSelect.value),
  };
  const id = idInput.value;

  try {
    if (id) {
      await api(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Student updated');
    } else {
      await api('/api/students', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Student added');
    }
    resetForm();
    loadStudents();
  } catch (err) {
    showToast(err.message, true);
  }
});

cancelBtn.addEventListener('click', resetForm);

// Event delegation: one listener handles every Edit/Delete button in the table
rows.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const student = students.find((s) => s.id === Number(btn.dataset.id));

  if (btn.dataset.action === 'edit') {
    startEdit(student);
  } else if (btn.dataset.action === 'delete' && confirm(`Delete ${student.name}?`)) {
    try {
      await api(`/api/students/${student.id}`, { method: 'DELETE' });
      showToast('Student deleted');
      if (idInput.value === String(student.id)) resetForm();
      loadStudents();
    } catch (err) {
      showToast(err.message, true);
    }
  }
});

// Debounced search: waits 300ms after typing stops before querying
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadStudents, 300);
});

// ---------- Start ----------
loadCourses().then(loadStudents).catch((err) => showToast(err.message, true));
