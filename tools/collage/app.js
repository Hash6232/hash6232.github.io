// app.ts - Main TypeScript for Image Collage Tool
let images = [];
// Check if string is valid URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    }
    catch {
        return false;
    }
}
// Check if URL is a Twitter/X status URL
function isTwitterUrl(url) {
    return /https?:\/\/(?:mobile\.|web\.|tweetdeck\.)?(?:twitter\.com|x\.com)\/[^\/]+\/status\/\d+/.test(url);
}
// Extract tweet ID from Twitter/X URL
function extractTweetId(url) {
    const match = url.match(/\/status\/(\d+)/);
    return match?.[1] || null;
}
// Get image size (placeholder, loads image)
function getImageSize(url) {
    // In real implementation, load image and return actual size
    // For now, placeholder
    return { width: 800, height: 600 };
}
const imageList = document.getElementById('image-list');
let selectedLayout = 'column';
const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('cols');
const scaleSmallest = document.getElementById('scale-smallest');
const scaleBiggest = document.getElementById('scale-biggest');
const scaleCrop = document.getElementById('scale-crop');
const backgroundColor = document.getElementById('background-color');
const colorDisplay = document.getElementById('color-display');
const transparentBg = document.getElementById('transparent-bg');
const transparentBtn = document.getElementById('transparent-btn');
const cropBtn = document.getElementById('crop-btn');
const staticAddItem = document.getElementById('static-add-item');
const gridControls = document.getElementById('grid-controls');
const fileInput = document.getElementById('file-input');
const previewCanvas = document.getElementById('preview');
const noImagesMessage = document.getElementById('no-images-message');
const ctx = previewCanvas.getContext('2d');
// Helper function to calculate luminance
function getLuminance(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
// Show/hide controls based on layout
function updateControls() {
    if (selectedLayout === 'grid') {
        gridControls.style.display = 'flex';
        cropBtn.style.display = 'block';
    }
    else {
        gridControls.style.display = 'none';
        cropBtn.style.display = 'none';
    }
    renderPreview();
}
// Layout button event listeners
const layoutButtons = document.querySelectorAll('.layout-btn');
layoutButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        layoutButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLayout = btn.getAttribute('data-layout');
        updateControls();
    });
});
// Scaling button event listeners
const scaleModeButtons = document.querySelectorAll('.scaling-btn[data-scale]');
scaleModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        scaleModeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const scale = btn.getAttribute('data-scale');
        if (scale === 'smallest') {
            scaleSmallest.checked = true;
            scaleBiggest.checked = false;
        }
        else if (scale === 'biggest') {
            scaleSmallest.checked = false;
            scaleBiggest.checked = true;
        }
        renderPreview();
    });
});
// Crop button event listener
cropBtn.addEventListener('click', () => {
    scaleCrop.checked = !scaleCrop.checked;
    cropBtn.classList.toggle('active');
    renderPreview();
});
// Static add item event listener
staticAddItem.addEventListener('click', () => fileInput.click());
// Color display click listener
colorDisplay.addEventListener('click', () => {
    if (colorDisplay.classList.contains('disabled'))
        return;
    backgroundColor.click();
});
// Background color change listener
backgroundColor.addEventListener('change', () => {
    colorDisplay.style.backgroundColor = backgroundColor.value;
    const luminance = getLuminance(backgroundColor.value);
    if (luminance < 0.5) {
        colorDisplay.classList.add('dark-bg');
    }
    else {
        colorDisplay.classList.remove('dark-bg');
    }
    renderPreview();
});
// Transparent button event listener
transparentBtn.addEventListener('click', () => {
    transparentBg.checked = !transparentBg.checked;
    transparentBtn.classList.toggle('active');
    if (transparentBg.checked) {
        colorDisplay.classList.add('disabled');
    }
    else {
        colorDisplay.classList.remove('disabled');
    }
    renderPreview();
});
// Update preview on grid inputs change
rowsInput.addEventListener('change', renderPreview);
colsInput.addEventListener('change', renderPreview);
backgroundColor.addEventListener('change', renderPreview);
transparentBg.addEventListener('change', renderPreview);
scaleSmallest.addEventListener('change', renderPreview);
scaleBiggest.addEventListener('change', renderPreview);
// Initialize controls
updateControls();
// File input change
fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
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
                if (blob)
                    addImage(blob);
            }
        }
        const text = e.clipboardData?.getData('text');
        if (text && isValidUrl(text)) {
            if (isTwitterUrl(text)) {
                const tweetId = extractTweetId(text);
                if (tweetId) {
                    fetchTwitterImages(tweetId);
                }
            }
            else {
                fetchImage(text);
            }
        }
    }
});
// Add image to list
function addImage(blob, name) {
    if (!blob.type.startsWith('image/')) {
        alert('Please upload image files only.');
        return;
    }
    const item = {
        blob,
        url: URL.createObjectURL(blob),
        name: name || 'image'
    };
    images.push(item);
    renderThumbnails();
    renderPreview();
}
// Fetch Twitter images from fxTwitter API
async function fetchTwitterImages(tweetId) {
    try {
        const apiUrl = `https://api.fxtwitter.com/status/${tweetId}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
            if (response.status === 404) {
                alert('Tweet not found or private');
            }
            else {
                alert('Error fetching tweet data');
            }
            return;
        }
        const data = await response.json();
        const photos = data.tweet.media?.photos;
        if (!photos || photos.length === 0) {
            alert('No images found in this tweet');
            return;
        }
        // Fetch all photos concurrently
        const fetchPromises = photos.map(photo => fetch(photo.url));
        const results = await Promise.allSettled(fetchPromises);
        // Get blobs for successful fetches
        const blobPromises = results.map(async (result, index) => {
            if (result.status === 'fulfilled' && result.value.ok) {
                return await result.value.blob();
            }
            return null;
        });
        const blobs = await Promise.all(blobPromises);
        // Filter successful blobs and add as images in order
        const successfulBlobs = blobs.filter((blob) => blob !== null);
        if (successfulBlobs.length === 0) {
            alert('Failed to load any images from this tweet');
            return;
        }
        // Add all images at once to maintain order and atomic UI update
        const newItems = successfulBlobs.map(blob => ({
            blob,
            url: URL.createObjectURL(blob),
            name: 'twitter-image'
        }));
        images.push(...newItems);
        renderThumbnails();
        renderPreview();
    }
    catch (error) {
        alert('Error fetching Twitter images: ' + error);
    }
}
// Fetch image from URL
async function fetchImage(url) {
    try {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error('Fetch failed');
        const blob = await response.blob();
        if (blob.type.startsWith('image/')) {
            addImage(blob, url);
        }
        else {
            alert('Invalid image URL');
        }
    }
    catch (error) {
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
        const targetItem = e.target.closest('.image-item:not(.add-item)');
        if (!targetItem)
            return;
        const fromIndex = parseInt(e.dataTransfer.getData('text'));
        const toIndex = Array.from(imageList.children).filter(child => !child.classList.contains('add-item')).indexOf(targetItem);
        if (toIndex !== -1 && fromIndex !== toIndex && fromIndex >= 0 && fromIndex < images.length && toIndex >= 0 && toIndex < images.length) {
            const moved = images[fromIndex];
            images.splice(fromIndex, 1);
            images.splice(toIndex, 0, moved);
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
    const loadedImages = [];
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
    }
    else if (layout === 'row') {
        // Uniform height, sum widths
        totalHeight = scaleDown ? Math.min(...loadedImages.map(img => img.height)) : Math.max(...loadedImages.map(img => img.height));
        totalWidth = loadedImages.reduce((sum, img) => sum + img.width * (totalHeight / img.height), 0);
    }
    else if (layout === 'grid') {
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
    // Fill canvas with background color if not transparent
    if (!transparentBg.checked) {
        ctx.fillStyle = backgroundColor.value;
        ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    }
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
        let drawn = false;
        if (layout === 'column') {
            drawWidth = totalWidth;
            drawHeight = img.height * (drawWidth / img.width);
        }
        else if (layout === 'row') {
            drawHeight = totalHeight;
            drawWidth = img.width * (drawHeight / img.height);
        }
        else if (layout === 'grid') {
            const rows = parseInt(rowsInput.value) || 2;
            const cols = parseInt(colsInput.value) || 2;
            const cellWidth = totalWidth / cols;
            const cellHeight = totalHeight / rows;
            drawWidth = cellWidth;
            drawHeight = cellHeight;
            if (scaleCrop.checked) {
                // Crop to fill cell (zoom in and crop from center)
                const cellAspect = cellWidth / cellHeight;
                const imgAspect = img.width / img.height;
                let sx, sy, sw, sh;
                if (imgAspect > cellAspect) {
                    sh = img.height;
                    sw = img.height * cellAspect;
                    sx = (img.width - sw) / 2;
                    sy = 0;
                }
                else {
                    sw = img.width;
                    sh = img.width / cellAspect;
                    sx = 0;
                    sy = (img.height - sh) / 2;
                }
                x = (index % cols) * cellWidth;
                y = Math.floor(index / cols) * cellHeight;
                ctx.drawImage(img, sx, sy, sw, sh, x, y, cellWidth, cellHeight);
                drawn = true;
            }
            else {
                // Fit to cell
                const imgAspect = img.width / img.height;
                const cellAspect = cellWidth / cellHeight;
                if (imgAspect > cellAspect) {
                    drawHeight = cellWidth / imgAspect;
                }
                else if (imgAspect < cellAspect) {
                    drawWidth = cellHeight * imgAspect;
                }
                x = (index % cols) * cellWidth + (cellWidth - drawWidth) / 2;
                y = Math.floor(index / cols) * cellHeight + (cellHeight - drawHeight) / 2;
            }
        }
        if (!drawn) {
            ctx.drawImage(img, x, y, drawWidth, drawHeight);
        }
        if (layout === 'column') {
            y += drawHeight;
        }
        else if (layout === 'row') {
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
    scaleCrop.checked = false;
    cropBtn.classList.remove('active');
    scaleModeButtons.forEach(btn => {
        if (btn.getAttribute('data-scale') === 'smallest')
            btn.classList.add('active');
        else
            btn.classList.remove('active');
    });
    backgroundColor.value = '#ffffff';
    colorDisplay.style.backgroundColor = backgroundColor.value;
    colorDisplay.classList.remove('dark-bg'); // White is light
    transparentBg.checked = false;
    transparentBtn.classList.remove('active');
    colorDisplay.classList.remove('disabled');
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
export {};
//# sourceMappingURL=app.js.map