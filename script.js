document.addEventListener('DOMContentLoaded', function() {
    // عناصر DOM
    const tokenInput = document.getElementById('github-token');
    const repoOwnerInput = document.getElementById('repo-owner');
    const repoNameInput = document.getElementById('repo-name');
    const repoBranchInput = document.getElementById('repo-branch');
    const saveTokenBtn = document.getElementById('save-token');
    const loadPackagesBtn = document.getElementById('load-packages');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const fileInfo = document.getElementById('file-info');
    const packageDetailsSection = document.getElementById('package-details-section');
    const uploadBtn = document.getElementById('upload-btn');
    const progressSection = document.getElementById('progress-section');
    const uploadProgress = document.getElementById('upload-progress');
    const progressStatus = document.getElementById('progress-status');
    const resultSection = document.getElementById('result-section');
    const resultMessage = document.getElementById('result-message');
    const packagesList = document.getElementById('packages-list');
    const packagesContainer = document.getElementById('packages-container');
    
    // عناصر نافذة التعديل
    const editModal = document.getElementById('edit-modal');
    const newPackageNameInput = document.getElementById('new-package-name');
    const confirmEditBtn = document.getElementById('confirm-edit');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const closeModalBtn = document.querySelector('.close');
    
    // عناصر تفاصيل الحزمة
    const packageNameInput = document.getElementById('package-name');
    const packageVersionInput = document.getElementById('package-version');
    const packageArchitectureSelect = document.getElementById('package-architecture');
    const packageSectionSelect = document.getElementById('package-section');
    const packageMaintainerInput = document.getElementById('package-maintainer');
    const packageDependsInput = document.getElementById('package-depends');
    const packageAuthorInput = document.getElementById('package-author');
    const packageDisplayNameInput = document.getElementById('package-display-name');
    const packageDescriptionTextarea = document.getElementById('package-description');
    
    let selectedFile = null;
    let packages = [];
    let repoConfig = {};
    let currentEditFilename = '';
    
    // تحميل الإعدادات المحفوظة
    const savedConfig = localStorage.getItem('repoConfig');
    if (savedConfig) {
        repoConfig = JSON.parse(savedConfig);
        tokenInput.value = repoConfig.token || '';
        repoOwnerInput.value = repoConfig.owner || '';
        repoNameInput.value = repoConfig.repo || '';
        repoBranchInput.value = repoConfig.branch || 'main';
    }
    
    // حفظ التوكن والإعدادات
    saveTokenBtn.addEventListener('click', function() {
        const token = tokenInput.value.trim();
        const owner = repoOwnerInput.value.trim();
        const repo = repoNameInput.value.trim();
        const branch = repoBranchInput.value.trim();
        
        if (token && owner && repo) {
            repoConfig = { token, owner, repo, branch };
            localStorage.setItem('repoConfig', JSON.stringify(repoConfig));
            showNotification('تم حفظ الإعدادات بنجاح!', 'success');
        } else {
            showNotification('يرجى ملء جميع الحقول', 'error');
        }
    });
    
    // تحميل الحزم من المستودع
    loadPackagesBtn.addEventListener('click', function() {
        if (!repoConfig.token || !repoConfig.owner || !repoConfig.repo) {
            showNotification('يرجى حفظ الإعدادات أولاً', 'error');
            return;
        }
        
        loadPackagesFromRepo();
    });
    
    // التعامل مع سحب وإفلات الملفات
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#b892ff';
        dropZone.style.background = 'rgba(13, 13, 26, 0.8)';
    });
    
    dropZone.addEventListener('dragleave', function() {
        dropZone.style.borderColor = '#6e44ff';
        dropZone.style.background = 'rgba(13, 13, 26, 0.4)';
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#6e44ff';
        dropZone.style.background = 'rgba(13, 13, 26, 0.4)';
        
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', function() {
        if (fileInput.files.length) {
            handleFileSelect(fileInput.files[0]);
        }
    });
    
    function handleFileSelect(file) {
        if (!file.name.endsWith('.deb')) {
            showNotification('يرجى اختيار ملف DEB فقط', 'error');
            return;
        }
        
        selectedFile = file;
        fileInfo.style.display = 'block';
        fileInfo.innerHTML = `
            <strong>اسم الملف:</strong> ${file.name}<br>
            <strong>الحجم:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB
        `;
        
        // تعبئة تفاصيل الحزمة تلقائياً
        const baseName = file.name.replace('.deb', '');
        packageNameInput.value = baseName;
        packageVersionInput.value = '1.0.0';
        packageMaintainerInput.value = 'المطور العربي';
        packageDependsInput.value = 'firmware (>= 14.0)';
        packageAuthorInput.value = 'فريق التطوير';
        packageDisplayNameInput.value = 'أداة متقدمة';
        packageDescriptionTextarea.value = 'هذه أداة متقدمة توفر وظائف مفيدة لنظام iOS';
        
        // إظهار قسم تفاصيل الحزمة
        packageDetailsSection.style.display = 'block';
        
        uploadBtn.disabled = !isFormValid();
    }
    
    function isFormValid() {
        return repoConfig.token && 
               repoConfig.owner && 
               repoConfig.repo && 
               selectedFile;
    }
    
    // رفع الملف إلى GitHub
    uploadBtn.addEventListener('click', async function() {
        if (!isFormValid()) {
            showNotification('يرجى ملء جميع الحقول واختيار ملف', 'error');
            return;
        }
        
        progressSection.style.display = 'block';
        resultSection.style.display = 'none';
        uploadProgress.style.width = '0%';
        progressStatus.textContent = 'جاري بدء الرفع...';
        
        try {
            // 1. رفع ملف DEB
            progressStatus.textContent = 'جاري رفع ملف DEB...';
            uploadProgress.style.width = '30%';
            
            const debContent = await readFileAsBase64(selectedFile);
            const debPath = `debs/${selectedFile.name}`;
            
            await uploadToGitHub(debPath, debContent, `إضافة حزمة: ${selectedFile.name}`);
            
            // 2. تحديث ملف Packages
            progressStatus.textContent = 'جاري تحديث ملف Packages...';
            uploadProgress.style.width = '60%';
            
            await updatePackagesFile(selectedFile.name, debPath);
            
            // 3. إنشاء ملفات مضغوطة
            progressStatus.textContent = 'جاري إنشاء ملفات مضغوطة...';
            uploadProgress.style.width = '90%';
            
            await createCompressedPackages();
            
            // اكتمال العملية
            uploadProgress.style.width = '100%';
            progressStatus.textContent = 'تم الرفع بنجاح!';
            
            // عرض نتيجة النجاح
            resultSection.style.display = 'block';
            resultSection.className = 'result-section success';
            resultMessage.innerHTML = `
                <p>تم رفع الحزمة بنجاح إلى المستودع!</p>
                <p>تم تحديث ملفات Packages تلقائياً.</p>
            `;
            
            showNotification('تم رفع الحزمة وتحديث المستودع بنجاح!', 'success');
            
            // إعادة تحميل قائمة الحزم
            loadPackagesFromRepo();
            
        } catch (error) {
            console.error('Error uploading file:', error);
            
            // عرض رسالة الخطأ
            resultSection.style.display = 'block';
            resultSection.className = 'result-section error';
            
            if (error.status === 401) {
                resultMessage.innerHTML = 'خطأ في المصادقة: التوكن غير صالح أو لا يمتلك الصلاحيات الكافية';
            } else if (error.status === 404) {
                resultMessage.innerHTML = 'المستودع غير موجود أو لا يمكن الوصول إليه';
            } else if (error.message.includes('invalid characters')) {
                resultMessage.innerHTML = 'خطأ في ترميز الملف: يحتوي الملف على أحرف غير صالحة';
            } else {
                resultMessage.innerHTML = `حدث خطأ أثناء الرفع: ${error.message || 'خطأ غير معروف'}`;
            }
            
            showNotification('فشل في رفع الحزمة!', 'error');
        }
    });
    
    // قراءة الملف كـ base64 (بدون استخدام btoa مباشرة على النص)
    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // استخدام هذه الطريقة الآمنة لتحويل الملف إلى base64
                const arrayBuffer = reader.result;
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    // رفع ملف إلى GitHub
    async function uploadToGitHub(path, content, message) {
        const url = `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${path}`;
        
        // التحقق مما إذا كان الملف موجوداً بالفعل
        let sha = null;
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${repoConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                sha = fileData.sha;
            }
        } catch (e) {
            // الملف غير موجود، سنقوم بإنشائه
        }
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${repoConfig.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message,
                content,
                branch: repoConfig.branch,
                sha: sha // إذا كان الملف موجوداً، نستخدم SHA للتحديث
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.message || 'Failed to upload file');
            error.status = response.status;
            throw error;
        }
        
        return response.json();
    }
    
    // تحديث ملف Packages
    async function updatePackagesFile(debName, debPath) {
        // حساب الهاشات
        const fileBuffer = await readFileAsArrayBuffer(selectedFile);
        const md5 = CryptoJS.MD5(CryptoJS.lib.WordArray.create(fileBuffer)).toString();
        const sha1 = CryptoJS.SHA1(CryptoJS.lib.WordArray.create(fileBuffer)).toString();
        const sha256 = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(fileBuffer)).toString();
        
        // إنشاء معلومات الحزمة من المدخلات
        const packageInfo = `
Package: ${packageNameInput.value || debName.replace('.deb', '')}
Version: ${packageVersionInput.value || '1.0.0'}
Architecture: ${packageArchitectureSelect.value}
Maintainer: ${packageMaintainerInput.value || 'Package Maintainer'}
Depends: ${packageDependsInput.value || 'firmware (>= 14.0)'}
Author: ${packageAuthorInput.value || 'Package Author'}
Name: ${packageDisplayNameInput.value || 'Package Display Name'}
Description: ${packageDescriptionTextarea.value || 'Description of the package'}
Section: ${packageSectionSelect.value}
Homepage: https://example.com
Filename: ${debPath}
Size: ${selectedFile.size}
MD5sum: ${md5}
SHA1: ${sha1}
SHA256: ${sha256}

`;
        
        // الحصول على محتوى Packages الحالي إذا كان موجوداً
        let packagesContent = '';
        try {
            const response = await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/Packages`, {
                headers: {
                    'Authorization': `token ${repoConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                // استخدام TextDecoder لفك تشفير المحتوى بشكل صحيح
                const decodedContent = atob(fileData.content);
                packagesContent = decodedContent;
            }
        } catch (e) {
            // الملف غير موجود، سنقوم بإنشائه
        }
        
        // إضافة معلومات الحزمة الجديدة
        packagesContent += packageInfo;
        
        // استخدام TextEncoder لتحويل المحتوى إلى base64 بشكل صحيح
        const encoder = new TextEncoder();
        const encodedContent = encoder.encode(packagesContent);
        let binary = '';
        for (let i = 0; i < encodedContent.byteLength; i++) {
            binary += String.fromCharCode(encodedContent[i]);
        }
        const base64Content = btoa(binary);
        
        // رفع ملف Packages المحدث
        await uploadToGitHub('Packages', base64Content, `تحديث Packages بإضافة: ${debName}`);
    }
    
    // قراءة الملف كـ ArrayBuffer
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    // إنشاء ملفات Packages المضغوطة
    async function createCompressedPackages() {
        // جلب محتوى Packages
        let packagesContent = '';
        try {
            const response = await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/Packages`, {
                headers: {
                    'Authorization': `token ${repoConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                packagesContent = atob(fileData.content);
            } else {
                throw new Error('Unable to fetch Packages file');
            }
        } catch (e) {
            throw new Error('Unable to fetch Packages file');
        }
        
        // إنشاء Packages.gz (محاكاة)
        // في الواقع الفعلي، تحتاج إلى استخدام مكتبة ضغط حقيقية
        try {
            // محاكاة عملية الضغط
            const compressedContent = btoa(unescape(encodeURIComponent(packagesContent)));
            await uploadToGitHub('Packages.gz', compressedContent, 'تحديث Packages.gz');
        } catch (error) {
            console.error('Error creating compressed packages:', error);
            throw new Error('Failed to create compressed packages');
        }
    }
    
    // تحميل الحزم من المستودع
    async function loadPackagesFromRepo() {
        try {
            packagesList.style.display = 'block';
            packagesContainer.innerHTML = '<p>جاري تحميل الحزم...</p>';
            
            const response = await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/debs`, {
                headers: {
                    'Authorization': `token ${repoConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Unable to fetch packages');
            }
            
            const files = await response.json();
            packagesContainer.innerHTML = '';
            
            if (files.length === 0) {
                packagesContainer.innerHTML = '<p>لا توجد حزم في المستودع</p>';
                return;
            }
            
            files.forEach(file => {
                if (file.name.endsWith('.deb')) {
                    const packageItem = document.createElement('div');
                    packageItem.classList.add('package-item');
                    packageItem.innerHTML = `
                        <div class="package-info">
                            <h3>${file.name}</h3>
                            <p>الحجم: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <div class="package-actions">
                            <button class="btn btn-secondary" onclick="downloadPackage('${file.name}')"><i class="fas fa-download"></i> تحميل</button>
                            <button class="btn btn-warning" onclick="openEditModal('${file.name}')"><i class="fas fa-edit"></i> تعديل</button>
                            <button class="btn btn-danger" onclick="deletePackage('${file.name}')"><i class="fas fa-trash"></i> حذف</button>
                        </div>
                    `;
                    packagesContainer.appendChild(packageItem);
                }
            });
            
        } catch (error) {
            packagesContainer.innerHTML = `<p>خطأ في تحميل الحزم: ${error.message}</p>`;
        }
    }
    
    // فتح نافذة تعديل الاسم
    window.openEditModal = function(filename) {
        currentEditFilename = filename;
        newPackageNameInput.value = filename;
        editModal.style.display = 'block';
    };
    
    // إغلاق نافذة التعديل
    function closeEditModal() {
        editModal.style.display = 'none';
        currentEditFilename = '';
        newPackageNameInput.value = '';
    }
    
    // إضافة مستمعي الأحداث للنافذة
    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    
    // النقر خارج النافذة يغلقها
    window.addEventListener('click', function(event) {
        if (event.target == editModal) {
            closeEditModal();
        }
    });
    
    // تأكيد تعديل الاسم
    confirmEditBtn.addEventListener('click', async function() {
        const newName = newPackageNameInput.value.trim();
        
        if (!newName) {
            showNotification('يرجى إدخال اسم جديد', 'error');
            return;
        }
        
        if (!newName.endsWith('.deb')) {
            showNotification('يجب أن ينتهي اسم الملف بـ .deb', 'error');
            return;
        }
        
        try {
            showNotification('جاري تعديل اسم الحزمة...', 'info');
            
            // 1. الحصول على محتوى الملف القديم
            const fileResponse = await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/debs/${currentEditFilename}`, {
                headers: {
                    'Authorization': `token ${repoConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!fileResponse.ok) {
                throw new Error('Failed to fetch old file');
            }
            
            const fileData = await fileResponse.json();
            const fileContent = fileData.content;
            const fileSha = fileData.sha;
            
            // 2. رفع الملف بالاسم الجديد
            await uploadToGitHub(`debs/${newName}`, fileContent, `إعادة تسمية الحزمة: ${currentEditFilename} إلى ${newName}`);
            
            // 3. حذف الملف القديم
            await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/debs/${currentEditFilename}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${repoConfig.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: `حذف الحزمة القديمة: ${currentEditFilename}`,
                    sha: fileSha,
                    branch: repoConfig.branch
                })
            });
            
            // 4. تحديث ملف Packages
            await updatePackagesAfterRename(currentEditFilename, newName);
            
            showNotification('تم تعديل اسم الحزمة بنجاح', 'success');
            closeEditModal();
            loadPackagesFromRepo(); // إعادة تحميل القائمة
            
        } catch (error) {
            console.error('Error editing package:', error);
            showNotification('فشل في تعديل اسم الحزمة', 'error');
        }
    });
    
    // تحديث ملف Packages بعد إعادة التسمية
    async function updatePackagesAfterRename(oldFilename, newFilename) {
        try {
            // جلب محتوى Packages الحالي
            const response = await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/Packages`, {
                headers: {
                    'Authorization': `token ${repoConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                let packagesContent = atob(fileData.content);
                
                // استبدال اسم الملف القديم بالجديد في معلومات الحزمة
                const packageName = oldFilename.replace('.deb', '');
                const newPackageName = newFilename.replace('.deb', '');
                
                // نستخدم تعبيرًا منتظمًا للعثور على الحزمة وتحديث حقل Filename
                const packagePattern = new RegExp(`(Package: ${packageName}\\s*[\\s\\S]*?Filename:\\s*)debs/${oldFilename}`, 'g');
                packagesContent = packagesContent.replace(packagePattern, `$1debs/${newFilename}`);
                
                // استخدام TextEncoder لتحويل المحتوى إلى base64 بشكل صحيح
                const encoder = new TextEncoder();
                const encodedContent = encoder.encode(packagesContent);
                let binary = '';
                for (let i = 0; i < encodedContent.byteLength; i++) {
                    binary += String.fromCharCode(encodedContent[i]);
                }
                const base64Content = btoa(binary);
                
                // رفع ملف Packages المحدث
                await uploadToGitHub('Packages', base64Content, `تعديل اسم الحزمة: ${oldFilename} إلى ${newFilename}`);
                
                // إعادة إنشاء الملفات المضغوطة
                await createCompressedPackages();
            }
        } catch (error) {
            console.error('Error updating Packages after rename:', error);
            throw new Error('Failed to update Packages file');
        }
    }
    
    // وظيفة عرض الإشعارات
    function showNotification(message, type) {
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '30px';
        notification.style.right = '30px';
        notification.style.padding = '15px 25px';
        notification.style.borderRadius = '10px';
        notification.style.color = 'white';
        notification.style.fontWeight = '600';
        notification.style.zIndex = '1000';
        notification.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
        notification.classList.add('fade-in');
        
        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, var(--success), #27ae60)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, var(--error), #c0392b)';
        } else {
            notification.style.background = 'linear-gradient(135deg, var(--info), #2980b9)';
        }
        
        document.body.appendChild(notification);
        
        // إخفاء الإشعار بعد 3 ثوان
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
    
    // جعل الدوال متاحة عالمياً للاستخدام من قبل الأزرار
    window.downloadPackage = function(filename) {
        window.open(`https://github.com/${repoConfig.owner}/${repoConfig.repo}/raw/${repoConfig.branch}/debs/${filename}`, '_blank');
    };
    
    window.deletePackage = async function(filename) {
        if (!confirm('هل أنت متأكد من أنك تريد حذف هذه الحزمة؟')) return;
        
        try {
            // الحصول على معلومات الملف أولاً للحصول على SHA
            const response = await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/debs/${filename}`, {
                headers: {
                    'Authorization': `token ${repoConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                
                // حذف الملف
                const deleteResponse = await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/debs/${filename}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${repoConfig.token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        message: `حذف الحزمة: ${filename}`,
                        sha: fileData.sha,
                        branch: repoConfig.branch
                    })
                });
                
                if (deleteResponse.ok) {
                    showNotification('تم حذف الحزمة بنجاح', 'success');
                    loadPackagesFromRepo(); // إعادة تحميل القائمة
                    
                    // تحديث ملف Packages بعد الحذف
                    await updatePackagesAfterDeletion(filename);
                } else {
                    throw new Error('Failed to delete file');
                }
            } else {
                throw new Error('File not found');
            }
        } catch (error) {
            showNotification('فشل في حذف الحزمة', 'error');
        }
    };
    
    // تحديث ملف Packages بعد حذف حزمة
    async function updatePackagesAfterDeletion(filename) {
        try {
            // جلب محتوى Packages الحالي
            const response = await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/Packages`, {
                headers: {
                    'Authorization': `token ${repoConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                let packagesContent = atob(fileData.content);
                
                // إزالة معلومات الحزمة المحذوفة
                const packageName = filename.replace('.deb', '');
                const packagePattern = new RegExp(`Package: ${packageName}[\\s\\S]*?(?=Package:|$)`, 'g');
                packagesContent = packagesContent.replace(packagePattern, '');
                
                // استخدام TextEncoder لتحويل المحتوى إلى base64 بشكل صحيح
                const encoder = new TextEncoder();
                const encodedContent = encoder.encode(packagesContent);
                let binary = '';
                for (let i = 0; i < encodedContent.byteLength; i++) {
                    binary += String.fromCharCode(encodedContent[i]);
                }
                const base64Content = btoa(binary);
                
                // رفع ملف Packages المحدث
                await uploadToGitHub('Packages', base64Content, `تحديث Packages بعد حذف: ${filename}`);
                
                // إعادة إنشاء الملفات المضغوطة
                await createCompressedPackages();
                
                showNotification('تم تحديث ملفات Packages بعد الحذف', 'success');
            }
        } catch (error) {
            console.error('Error updating Packages after deletion:', error);
            showNotification('حدث خطأ أثناء تحديث ملفات Packages', 'error');
        }
    }
});