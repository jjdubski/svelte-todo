# TODO List

- Auto resize text area for tasks page & edit modal (expand & shrink based on content) then return to normal after
- Update accent color
- Shrink navbar text slightly to avoid overlap of settings and profile button. It overlaps between 640-700px wide screen
- Kanban board should either be 3 wide (pending, in progess or done) or stacked vertically (never 2 and then 1)
- Accent color should effect the help button as well
- If possible limit the color of colorpicker to not be pure white or pure black, otherwise if user attempts to set white/black just use the default
- Each theme should have its own accent color
- Contrast issues with BackButton if color too dark & darkmode on, also with light color and light mode on
- Incorporate shadcn elements into project with shadcn-svelte
- Console issues:
  - The Shared Storage API is deprecated and will be removed in a future release.
    1 source
    content.js:687
  - Multiple form field elements in the same form have the same id attribute value. This might prevent the browser from correctly autofilling the form.
    To fix this issue, use unique id attribute values for each form field.
- Calander page gets weird on certain screen sizes, it should always have 'Calendar View' title on top and the BackButton. If the Month selector can fit that't fine, if it cant force it to be in the row below (how it looks on mobile/small screens already)
- Switching between pages causes a load in flash. Use a skeleton style where the layout stays
- Mobile/smaller screen uneven select box
- ~~Filter by category doesn't work, selecting tags does not work either~~ ✅ Fixed
- ~~Search input accent color~~ ✅ Fixed
- ~~Search tag:xxx not creating token~~ ✅ Fixed
- ~~Keyboard shortcuts not added~~ ✅ Fixed (`/`, `n`, `e`, `a`, `?`, `Esc`, `Ctrl+F`)
- ~~Help dialog now shows page-specific shortcuts~~ ✅ Fixed
- ~~Multi-select instructions only on board/archived~~ ✅ Fixed
- fix mobile web app navigation
