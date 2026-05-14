<script>
	import { tick } from 'svelte';

	let { title = '', description = '', priority = '', tags = [], tagColors = {}, targetEl = null } = $props();

	let bodyEl = $state(null);
	let isVisible = $state(false);

	let tooltipEl;
	let cardEl;
	let titleEl;
	let priorityEl;
	let descriptionEl;
	let tagsEl;
	let arrowEl;

	let showTimeout;
	let hideTimeout;

	function clearShowTimeout() {
		if (showTimeout) {
			clearTimeout(showTimeout);
			showTimeout = undefined;
		}
	}

	function clearHideTimeout() {
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = undefined;
		}
	}

	function getPriorityColor(priorityValue) {
		if (priorityValue === 'high') return 'var(--priority-high)';
		if (priorityValue === 'low') return 'var(--priority-low)';
		return 'var(--priority-medium)';
	}

	function getTagColor(tag) {
		const color = tagColors?.[tag];
		return typeof color === 'string' && color.trim() ? color : '#64748b';
	}

	function setArrowPlacement(placement) {
		if (!arrowEl) return;

		arrowEl.className = 'absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45';
		arrowEl.style.background = 'var(--card-bg)';
		arrowEl.style.borderColor = 'var(--border)';

		if (placement === 'below') {
			arrowEl.classList.add('bottom-full', 'border-l', 'border-t');
			return;
		}

		arrowEl.classList.add('top-full', 'border-r', 'border-b');
	}

	function updateContent() {
		if (!titleEl || !priorityEl || !descriptionEl || !tagsEl) return;

		titleEl.textContent = title || '';

		if (priority) {
			priorityEl.textContent = priority;
			priorityEl.style.display = 'inline-block';
			priorityEl.style.background = getPriorityColor(priority);
		} else {
			priorityEl.style.display = 'none';
			priorityEl.textContent = '';
		}

		if (description) {
			descriptionEl.textContent = description.length > 80 ? `${description.slice(0, 80)}...` : description;
			descriptionEl.style.display = 'block';
		} else {
			descriptionEl.style.display = 'none';
			descriptionEl.textContent = '';
		}

		tagsEl.replaceChildren();

		if (Array.isArray(tags) && tags.length > 0) {
			tagsEl.style.display = 'flex';

			tags.slice(0, 3).forEach((tag) => {
				const tagEl = document.createElement('span');
				tagEl.className = 'rounded px-1 text-[10px] text-white';
				tagEl.style.background = getTagColor(tag);
				tagEl.textContent = tag;
				tagsEl.appendChild(tagEl);
			});
		} else {
			tagsEl.style.display = 'none';
		}
	}

	async function updatePosition() {
		if (!tooltipEl || !targetEl || !isVisible) return;

		const rect = targetEl.getBoundingClientRect();
		const tooltipRect = tooltipEl.getBoundingClientRect();
		const viewportPadding = 8;
		const offset = 8;

		let left = rect.left + rect.width / 2;
		const halfTooltipWidth = tooltipRect.width / 2;

		left = Math.max(
			viewportPadding + halfTooltipWidth,
			Math.min(left, window.innerWidth - viewportPadding - halfTooltipWidth)
		);

		let placement = 'above';
		let top = rect.top - offset;

		if (rect.top - offset - tooltipRect.height < viewportPadding) {
			placement = 'below';
			top = rect.bottom + offset;
		}

		if (placement === 'below' && top + tooltipRect.height > window.innerHeight - viewportPadding) {
			placement = 'above';
			top = Math.max(viewportPadding + tooltipRect.height, rect.top - offset);
		}

		tooltipEl.style.left = `${left}px`;
		tooltipEl.style.top = `${top}px`;
		tooltipEl.style.transform = placement === 'above' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';

		setArrowPlacement(placement);
	}

	async function showTooltip() {
		if (!tooltipEl || !targetEl) return;

		updateContent();
		tooltipEl.style.display = 'block';
		isVisible = true;

		await tick();
		await updatePosition();
	}

	function hideTooltip() {
		if (!tooltipEl) return;

		isVisible = false;
		tooltipEl.style.display = 'none';
	}

	function scheduleShow() {
		clearHideTimeout();
		clearShowTimeout();

		showTimeout = setTimeout(() => {
			void showTooltip();
		}, 200);
	}

	function scheduleHide() {
		clearShowTimeout();
		clearHideTimeout();

		hideTimeout = setTimeout(() => {
			hideTooltip();
		}, 100);
	}

	function handleTooltipMouseEnter() {
		clearHideTimeout();
	}

	function handleTooltipMouseLeave() {
		scheduleHide();
	}

	function handleViewportChange() {
		if (!isVisible) return;
		void updatePosition();
	}

	function createTooltipElement() {
		if (typeof document === 'undefined' || tooltipEl) return;

		tooltipEl = document.createElement('div');
		tooltipEl.className = 'tooltip-portal fixed z-[1000]';
		tooltipEl.style.display = 'none';

		cardEl = document.createElement('div');
		cardEl.className = 'relative w-max max-w-[220px] rounded-lg border px-2 py-1 text-xs shadow-lg';
		cardEl.style.background = 'var(--card-bg)';
		cardEl.style.borderColor = 'var(--border)';

		const headingEl = document.createElement('div');
		headingEl.className = 'flex items-center gap-1.5';

		titleEl = document.createElement('span');
		titleEl.className = 'font-semibold';
		titleEl.style.color = 'var(--text-heading)';

		priorityEl = document.createElement('span');
		priorityEl.className = 'rounded px-1 text-[10px] font-bold text-white uppercase';
		priorityEl.style.display = 'none';

		headingEl.appendChild(titleEl);
		headingEl.appendChild(priorityEl);

		descriptionEl = document.createElement('p');
		descriptionEl.className = 'm-0 mt-0.5';
		descriptionEl.style.color = 'var(--text-secondary)';
		descriptionEl.style.display = 'none';

		tagsEl = document.createElement('div');
		tagsEl.className = 'mt-0.5 flex flex-wrap gap-1';
		tagsEl.style.display = 'none';

		arrowEl = document.createElement('div');
		setArrowPlacement('above');

		cardEl.appendChild(headingEl);
		cardEl.appendChild(descriptionEl);
		cardEl.appendChild(tagsEl);
		cardEl.appendChild(arrowEl);
		tooltipEl.appendChild(cardEl);

		tooltipEl.addEventListener('mouseenter', handleTooltipMouseEnter);
		tooltipEl.addEventListener('mouseleave', handleTooltipMouseLeave);

		(document.body || bodyEl).appendChild(tooltipEl);
	}

	function destroyTooltipElement() {
		clearShowTimeout();
		clearHideTimeout();

		if (!tooltipEl) return;

		tooltipEl.removeEventListener('mouseenter', handleTooltipMouseEnter);
		tooltipEl.removeEventListener('mouseleave', handleTooltipMouseLeave);
		tooltipEl.remove();

		tooltipEl = undefined;
		cardEl = undefined;
		titleEl = undefined;
		priorityEl = undefined;
		descriptionEl = undefined;
		tagsEl = undefined;
		arrowEl = undefined;
	}

	$effect(() => {
		createTooltipElement();

		return () => {
			destroyTooltipElement();
		};
	});

	$effect(() => {
		if (!tooltipEl) return;

		if (targetEl) {
			scheduleShow();
			return;
		}

		scheduleHide();
	});

	$effect(() => {
		if (!tooltipEl || !isVisible) return;

		updateContent();
		void updatePosition();
		title;
		description;
		priority;
		tags;
		tagColors;
		targetEl;
	});

	$effect(() => {
		if (!tooltipEl || !bodyEl) return;
		if (tooltipEl.parentNode === bodyEl) return;

		bodyEl.appendChild(tooltipEl);
	});
</script>

<svelte:body bind:this={bodyEl} />
<svelte:window onresize={handleViewportChange} onscroll={handleViewportChange} />
