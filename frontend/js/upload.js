class Upload {
    constructor() {
        this.uploadContainer = document.getElementById('upload-container');
        this.uploadForm = document.getElementById('post-form');
        this.imageInput = document.getElementById('image-input');
        this.previewImage = document.getElementById('preview-image');
        this.uploadLink = document.getElementById('upload-link');

        this.bindEvents();
    }

    bindEvents() {
        this.uploadLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showUpload();
        });

        this.imageInput.addEventListener('change', (e) => {
            this.handleImagePreview(e);
        });

        this.uploadForm.addEventListener('submit', (e) => {
            this.handleUpload(e);
        });
    }

    handleImagePreview(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.previewImage.src = e.target.result;
                this.previewImage.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    async handleUpload(e) {
        e.preventDefault();
        const formData = new FormData();
        formData.append('image', this.imageInput.files[0]);
        formData.append('caption', this.uploadForm.querySelector('textarea').value);

        try {
            await api.createPost(formData);
            this.uploadForm.reset();
            this.previewImage.style.display = 'none';
            feed.loadPosts();
            this.showFeed();
        } catch (error) {
            alert('Error creating post. Please try again.');
        }
    }

    showUpload() {
        document.getElementById('feed-container').classList.add('hidden');
        document.getElementById('profile-container').classList.add('hidden');
        this.uploadContainer.classList.remove('hidden');
    }

    showFeed() {
        this.uploadContainer.classList.add('hidden');
        document.getElementById('feed-container').classList.remove('hidden');
    }
}

const upload = new Upload(); 