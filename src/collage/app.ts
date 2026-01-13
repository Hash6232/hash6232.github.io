// app.ts - Main TypeScript for Image Collage Tool

interface ImageItem {
    blob: Blob;
    url: string;
    name: string;
}

let images: ImageItem[] = [];

// Check if string is valid URL
function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

// Get image size (placeholder, loads image)
function getImageSize(url: string): { width: number; height: number } {
    // In real implementation, load image and return actual size
    // For now, placeholder
    return { width: 800, height: 600 };
}
const imageList = document.getElementById('image-list') as HTMLDivElement;
let selectedLayout = 'column';
const rowsInput = document.getElementById('rows') as HTMLInputElement;
const colsInput = document.getElementById('cols') as HTMLInputElement;
const scaleSmallest = document.getElementById('scale-smallest') as HTMLInputElement;
const scaleBiggest = document.getElementById('scale-biggest') as HTMLInputElement;
const letterboxColor = document.getElementById('letterbox-color') as HTMLInputElement;
const transparentBg = document.getElementById('transparent-bg') as HTMLInputElement;
const transparentBtn = document.getElementById('transparent-btn') as HTMLButtonElement;
const staticAddItem = document.getElementById('static-add-item') as HTMLDivElement;
const gridControls = document.getElementById('grid-controls')!;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const previewCanvas = document.getElementById('preview') as HTMLCanvasElement;
const noImagesMessage = document.getElementById('no-images-message') as HTMLDivElement;
const ctx = previewCanvas.getContext('2d')!;

// Show/hide controls based on layout
function updateControls() {
    if (selectedLayout === 'grid') {
        gridControls.style.display = 'flex';
    } else {
        gridControls.style.display = 'none';
    }
    renderPreview();
}

// Layout button event listeners
const layoutButtons = document.querySelectorAll('.layout-btn');
layoutButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        layoutButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLayout = btn.getAttribute('data-layout')!;
        updateControls();
    });
});

// Scaling button event listeners
const scalingButtons = document.querySelectorAll('.scaling-btn');
scalingButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        scalingButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const scale = btn.getAttribute('data-scale');
        if (scale === 'smallest') {
            scaleSmallest.checked = true;
            scaleBiggest.checked = false;
        } else {
            scaleSmallest.checked = false;
            scaleBiggest.checked = true;
        }
        renderPreview();
    });
});

// Static add item event listener
staticAddItem.addEventListener('click', () => fileInput.click());

// Transparent button event listener
transparentBtn.addEventListener('click', () => {
    transparentBg.checked = !transparentBg.checked;
    transparentBtn.classList.toggle('active');
    renderPreview();
});

// Update preview on grid inputs change
rowsInput.addEventListener('change', renderPreview);
colsInput.addEventListener('change', renderPreview);
letterboxColor.addEventListener('change', renderPreview);
transparentBg.addEventListener('change', renderPreview);
scaleSmallest.addEventListener('change', renderPreview);
scaleBiggest.addEventListener('change', renderPreview);

// Initialize controls
updateControls();



// File input change
fileInput.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files) {
        Array.from(files).forEach(file => addImage(file));
    }
});

// Paste handling
document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (items) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (blob) addImage(blob);
            }
        }
        const text = e.clipboardData?.getData('text');
        if (text && isValidUrl(text)) {
            fetchImage(text);
        }
    }
});

// Add image to list
function addImage(blob: Blob, name?: string) {
    const item: ImageItem = {
        blob,
        url: URL.createObjectURL(blob),
        name: name || 'image'
    };
    images.push(item);
    renderThumbnails();
    renderPreview();
}

// Fetch image from URL
async function fetchImage(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');
        const blob = await response.blob();
        if (blob.type.startsWith('image/')) {
            addImage(blob, url);
        } else {
            alert('Invalid image URL');
        }
    } catch (error) {
        alert('Error fetching image: ' + error);
    }
}



// Render thumbnails
function renderThumbnails() {
    // Clear existing thumbnails but keep the static add item
    const children = Array.from(imageList.children);
    children.forEach(child => {
        if (!child.classList.contains('add-item')) {
            imageList.removeChild(child);
        }
    });

    images.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.draggable = true;
        div.addEventListener('dragstart', (e) => e.dataTransfer?.setData('text', index.toString()));

        const img = document.createElement('img');
        img.src = item.url;
        div.appendChild(img);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'X';
        removeBtn.addEventListener('click', () => {
            images.splice(index, 1);
            renderThumbnails();
            renderPreview();
        });
        div.appendChild(removeBtn);

        // Insert before the add item
        const addItem = imageList.querySelector('.add-item');
        imageList.insertBefore(div, addItem);
    });

    // Drag and drop reordering (exclude add item)
    imageList.addEventListener('dragover', (e) => e.preventDefault());
    imageList.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetItem = (e.target as HTMLElement).closest('.image-item:not(.add-item)') as HTMLElement;
        if (!targetItem) return;
        const fromIndex = parseInt(e.dataTransfer!.getData('text'));
        const toIndex = Array.from(imageList.children).filter(child => !child.classList.contains('add-item')).indexOf(targetItem);
        if (toIndex !== -1 && fromIndex !== toIndex && fromIndex >= 0 && fromIndex < images.length && toIndex >= 0 && toIndex < images.length) {
            const moved = images[fromIndex]!;
            images.splice(fromIndex, 1);
            images.splice(toIndex, 0, moved as ImageItem);
            renderThumbnails();
            renderPreview();
        }
    });
}

// Render preview on canvas
async function renderPreview() {
    if (images.length === 0) {
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCanvas.width = 0;
        previewCanvas.height = 0;
        previewCanvas.style.width = '0px';
        previewCanvas.style.height = '0px';
        previewCanvas.style.display = 'none';
        noImagesMessage.style.display = 'block';
        return;
    }
    previewCanvas.style.display = 'block';
    noImagesMessage.style.display = 'none';

    const layout = selectedLayout;
    const scaleDown = scaleSmallest.checked;

    // Load all images
    const loadedImages: HTMLImageElement[] = [];
    for (const item of images) {
        const img = new Image();
        img.src = item.url;
        await new Promise((resolve) => { img.onload = resolve; });
        loadedImages.push(img);
    }

    // Calculate dimensions
    let totalWidth = 0;
    let totalHeight = 0;

    if (layout === 'column') {
        // Uniform width, sum heights
        totalWidth = scaleDown ? Math.min(...loadedImages.map(img => img.width)) : Math.max(...loadedImages.map(img => img.width));
        totalHeight = loadedImages.reduce((sum, img) => sum + img.height * (totalWidth / img.width), 0);
    } else if (layout === 'row') {
        // Uniform height, sum widths
        totalHeight = scaleDown ? Math.min(...loadedImages.map(img => img.height)) : Math.max(...loadedImages.map(img => img.height));
        totalWidth = loadedImages.reduce((sum, img) => sum + img.width * (totalHeight / img.height), 0);
    } else if (layout === 'grid') {
        const rows = parseInt(rowsInput.value) || 2;
        const cols = parseInt(colsInput.value) || 2;
        const numImages = loadedImages.length;
        const gridWidth = scaleDown ? Math.min(...loadedImages.map(img => img.width)) : Math.max(...loadedImages.map(img => img.width));
        const gridHeight = scaleDown ? Math.min(...loadedImages.map(img => img.height)) : Math.max(...loadedImages.map(img => img.height));
        totalWidth = gridWidth * cols;
        totalHeight = gridHeight * rows;
    }

    // Limit size
    const maxSize = 10000;
    if (totalWidth > maxSize || totalHeight > maxSize) {
        const ratio = Math.min(maxSize / totalWidth, maxSize / totalHeight);
        totalWidth *= ratio;
        totalHeight *= ratio;
    }

    previewCanvas.width = totalWidth;
    previewCanvas.height = totalHeight;

    // Scale for display to fit viewport
    const maxW = window.innerWidth * 0.8;
    const maxH = window.innerHeight * 0.6;
    const scale = Math.min(1, maxW / totalWidth, maxH / totalHeight);
    previewCanvas.style.width = totalWidth * scale + 'px';
    previewCanvas.style.height = totalHeight * scale + 'px';

    // Draw images
    let x = 0;
    let y = 0;

    loadedImages.forEach((img, index) => {
        let drawWidth = img.width;
        let drawHeight = img.height;

        if (layout === 'column') {
            drawWidth = totalWidth;
            drawHeight = img.height * (drawWidth / img.width);
        } else if (layout === 'row') {
            drawHeight = totalHeight;
            drawWidth = img.width * (drawHeight / img.height);
        } else if (layout === 'grid') {
            const rows = parseInt(rowsInput.value) || 2;
            const cols = parseInt(colsInput.value) || 2;
            const cellWidth = totalWidth / cols;
            const cellHeight = totalHeight / rows;
            drawWidth = cellWidth;
            drawHeight = cellHeight;

            // Letterboxing
            const imgAspect = img.width / img.height;
            const cellAspect = cellWidth / cellHeight;
            if (imgAspect > cellAspect) {
                // Fit width, letterbox height
                drawHeight = cellWidth / imgAspect;
                // Fill background
                const bgColor = transparentBg.checked ? 'transparent' : letterboxColor.value;
                ctx.fillStyle = bgColor;
                ctx.fillRect((index % cols) * cellWidth, Math.floor(index / cols) * cellHeight, cellWidth, cellHeight);
            } else if (imgAspect < cellAspect) {
                // Fit height, letterbox width
                drawWidth = cellHeight * imgAspect;
                // Fill background
                const bgColor = transparentBg.checked ? 'transparent' : letterboxColor.value;
                ctx.fillStyle = bgColor;
                ctx.fillRect((index % cols) * cellWidth, Math.floor(index / cols) * cellHeight, cellWidth, cellHeight);
            }
            // If aspect matches, no fill needed

            x = (index % cols) * cellWidth + (cellWidth - drawWidth) / 2;
            y = Math.floor(index / cols) * cellHeight + (cellHeight - drawHeight) / 2;
        }

        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        if (layout === 'column') {
            y += drawHeight;
        } else if (layout === 'row') {
            x += drawWidth;
        }
    });
}





// Reset controls on page load
window.addEventListener('load', () => {
    selectedLayout = 'column';
    rowsInput.value = '2';
    colsInput.value = '2';
    scaleSmallest.checked = true;
    scaleBiggest.checked = false;
    scalingButtons.forEach(btn => {
        if (btn.getAttribute('data-scale') === 'smallest') btn.classList.add('active');
        else btn.classList.remove('active');
    });
    letterboxColor.value = '#ffffff';
    transparentBg.checked = false;
    transparentBtn.classList.remove('active');
    updateControls();
});

// Open preview in new tab on click
previewCanvas.addEventListener('click', () => {
    previewCanvas.toBlob((blob) => {
        if (blob) {
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        }
    });
});

// Initial render
renderThumbnails();