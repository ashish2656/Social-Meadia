class Upload {
    constructor() {
        this.form = document.getElementById('post-form');
        this.imageInput = document.getElementById('image-input');
        this.previewImage = document.getElementById('preview-image');
        this.caption = document.querySelector('#post-form textarea');
        
        if (this.form) {
            this.bindEvents();
        }
    }

    bindEvents() {
        // Image preview
        this.imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.previewImage.src = e.target.result;
                    this.previewImage.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        // Form submission
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('image', this.imageInput.files[0]);
            formData.append('caption', this.caption.value);

            try {
                const response = await api.post('/api/posts', formData);
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error creating post:', error);
                alert('Error creating post. Please try again.');
            }
        });
    }
}

// Initialize upload functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('upload-container')) {
        new Upload();
    }
}); 