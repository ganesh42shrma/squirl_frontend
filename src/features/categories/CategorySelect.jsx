// The category control used across the app. It used to be a native <select>; with ~170 categories
// that was hard to scan, so it now opens a searchable dialog (main categories, then subcategories).
// Kept under this name so every caller keeps working; see CategoryPicker for the props.
export { CategoryPicker as CategorySelect } from './CategoryPicker';
