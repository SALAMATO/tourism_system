/**
 * This configuration was generated using the CKEditor 5 Builder. You can modify it anytime using this link:
 * https://ckeditor.com/ckeditor-5/builder/#installation/NoNgNARATAdAjABhgik4HYAsUoFYDM2AnEQBxxn45Ejpya6b6HojMIgL4hnaaoQAXgAtUCMMDhhx4qbIC6kELgAmAQwBGuDRHlA=
 */

const {
	ClassicEditor,
	Autosave,
	Essentials,
	Paragraph,
	TextTransformation,
	LinkImage,
	Link,
	ImageBlock,
	ImageToolbar,
	Bold,
	CloudServices,
	ImageUpload,
	ImageInsertViaUrl,
	AutoImage,
	Table,
	TableToolbar,
	Heading,
	ImageTextAlternative,
	ImageCaption,
	ImageStyle,
	ImageInline,
	Italic,
	List,
	TodoList,
	Underline,
	Fullscreen,
	Autoformat,
	Strikethrough,
	Code,
	Subscript,
	FontBackgroundColor,
	FontColor,
	FontFamily,
	FontSize,
	Superscript,
	Highlight,
	AutoLink,
	BlockQuote,
	HorizontalLine,
	Indent,
	IndentBlock,
	Alignment,
	GeneralHtmlSupport,
	Style
} = window.CKEDITOR;

/**
 * This is a 24-hour evaluation key. Create a free account to use CDN: https://portal.ckeditor.com/checkout?plan=free
 */
const LICENSE_KEY =
	'eyJhbGciOiJFUzI1NiJ9.eyJleHAiOjE4MDQ1NTAzOTksImp0aSI6IjA1NGIxNGM4LWY0YTYtNDBkMS1hMzNmLWM1OWI2ZGNiNDliNSIsInVzYWdlRW5kcG9pbnQiOiJodHRwczovL3Byb3h5LWV2ZW50LmNrZWRpdG9yLmNvbSIsImRpc3RyaWJ1dGlvbkNoYW5uZWwiOlsiY2xvdWQiLCJkcnVwYWwiXSwiZmVhdHVyZXMiOlsiRFJVUCIsIkUyUCIsIkUyVyJdLCJyZW1vdmVGZWF0dXJlcyI6WyJQQiIsIlJGIiwiU0NIIiwiVENQIiwiVEwiLCJUQ1IiLCJJUiIsIlNVQSIsIkI2NEEiLCJMUCIsIkhFIiwiUkVEIiwiUEZPIiwiV0MiLCJGQVIiLCJCS00iLCJGUEgiLCJNUkUiXSwidmMiOiI4MzQyNDdkZSJ9.45H0htEMMcvtE47Z6jrbvSaGorVB25GHYwHahJHfeX05lBPlZ5SmoaXu2vMHy9wbLJ7cKrfpKIOV7opTnzGkug';



const editorConfig = {
	toolbar: {
		items: [
			'undo',
			'redo',
			'|',
			'fullscreen',
			'|',
			'heading',
			'style',
			'|',
			'fontSize',
			'fontFamily',
			'fontColor',
			'fontBackgroundColor',
			'|',
			'bold',
			'italic',
			'underline',
			'strikethrough',
			'subscript',
			'superscript',
			'code',
			'|',
			'horizontalLine',
			'link',
			'insertTable',
			'highlight',
			'blockQuote',
			'|',
			'alignment',
			'|',
			'bulletedList',
			'numberedList',
			'todoList',
			'outdent',
			'indent'
		],
		shouldNotGroupWhenFull: false
	},
	plugins: [
		Alignment,
		Autoformat,
		AutoImage,
		AutoLink,
		Autosave,
		BlockQuote,
		Bold,
		CloudServices,
		Code,
		Essentials,
		FontBackgroundColor,
		FontColor,
		FontFamily,
		FontSize,
		Fullscreen,
		GeneralHtmlSupport,
		Heading,
		Highlight,
		HorizontalLine,
		ImageBlock,
		ImageCaption,
		ImageInline,
		ImageInsertViaUrl,
		ImageStyle,
		ImageTextAlternative,
		ImageToolbar,
		ImageUpload,
		Indent,
		IndentBlock,
		Italic,
		Link,
		LinkImage,
		List,
		Paragraph,
		Strikethrough,
		Style,
		Subscript,
		Superscript,
		Table,
		TableToolbar,
		TextTransformation,
		TodoList,
		Underline
	],
	fontFamily: {
		supportAllValues: true
	},
	fontSize: {
		options: [10, 12, 14, 'default', 18, 20, 22],
		supportAllValues: true
	},
	fullscreen: {
		onEnterCallback: container =>
			container.classList.add(
				'editor-container',
				'editor-container_classic-editor',
				'editor-container_include-style',
				'editor-container_include-fullscreen',
				'main-container'
			)
	},
	heading: {
		options: [
			{
				model: 'paragraph',
				title: 'Paragraph',
				class: 'ck-heading_paragraph'
			},
			{
				model: 'heading1',
				view: 'h1',
				title: 'Heading 1',
				class: 'ck-heading_heading1'
			},
			{
				model: 'heading2',
				view: 'h2',
				title: 'Heading 2',
				class: 'ck-heading_heading2'
			},
			{
				model: 'heading3',
				view: 'h3',
				title: 'Heading 3',
				class: 'ck-heading_heading3'
			},
			{
				model: 'heading4',
				view: 'h4',
				title: 'Heading 4',
				class: 'ck-heading_heading4'
			},
			{
				model: 'heading5',
				view: 'h5',
				title: 'Heading 5',
				class: 'ck-heading_heading5'
			},
			{
				model: 'heading6',
				view: 'h6',
				title: 'Heading 6',
				class: 'ck-heading_heading6'
			}
		]
	},
	htmlSupport: {
		allow: [
			{
				name: /^.*$/,
				styles: true,
				attributes: true,
				classes: true
			}
		]
	},
	image: {
		toolbar: ['toggleImageCaption', 'imageTextAlternative', '|', 'imageStyle:inline', 'imageStyle:wrapText', 'imageStyle:breakText']
	},
	language: 'zh',
	licenseKey: LICENSE_KEY,
	link: {
		addTargetToExternalLinks: true,
		defaultProtocol: 'https://',
		decorators: {
			toggleDownloadable: {
				mode: 'manual',
				label: 'Downloadable',
				attributes: {
					download: 'file'
				}
			}
		}
	},
	placeholder: 'Type or paste your content here!',
	style: {
		definitions: [
			{
				name: 'Article category',
				element: 'h3',
				classes: ['category']
			},
			{
				name: 'Title',
				element: 'h2',
				classes: ['document-title']
			},
			{
				name: 'Subtitle',
				element: 'h3',
				classes: ['document-subtitle']
			},
			{
				name: 'Info box',
				element: 'p',
				classes: ['info-box']
			},
			{
				name: 'CTA Link Primary',
				element: 'a',
				classes: ['button', 'button--green']
			},
			{
				name: 'CTA Link Secondary',
				element: 'a',
				classes: ['button', 'button--black']
			},
			{
				name: 'Marker',
				element: 'span',
				classes: ['marker']
			},
			{
				name: 'Spoiler',
				element: 'span',
				classes: ['spoiler']
			}
		]
	},
	table: {
		contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
	}
};

// CKEditor Super 实例存储
const superEditorInstances = {};

// 初始化指定的超级编辑器
async function initSuperEditor(elementId, customConfig = {}) {
	try {
		const element = document.getElementById(elementId);
		if (!element) {
			console.warn(`元素 ${elementId} 不存在`);
			return null;
		}

		// 如果已经初始化过且未被销毁，直接返回现有实例（避免重复初始化）
		if (superEditorInstances[elementId] && !superEditorInstances[elementId]._destroyed) {
			console.log(`编辑器 ${elementId} 已存在，复用现有实例`);
			return superEditorInstances[elementId];
		}

		// 合并配置
		const finalConfig = {
			...editorConfig,
			...customConfig,
			placeholder: customConfig.placeholder || editorConfig.placeholder
		};

		// 使用ClassicEditor创建超级编辑器
		const editor = await ClassicEditor.create(element, finalConfig);
		superEditorInstances[elementId] = editor;

		console.log(`超级编辑器 ${elementId} 初始化成功`);

		// 监听内容变化，同步到textarea
		editor.model.document.on('change:data', () => {
			element.value = editor.getData();
		});

		return editor;
	} catch (error) {
		console.error(`初始化超级编辑器 ${elementId} 失败:`, error);
		return null;
	}
}

// 设置超级编辑器内容
function setSuperEditorContent(elementId, content) {
	try {
		const editor = superEditorInstances[elementId];
		if (editor) {
			editor.setData(content || '');
			console.log(`设置超级编辑器 ${elementId} 内容成功`);
		} else {
			console.warn(`超级编辑器 ${elementId} 未初始化`);
		}
	} catch (error) {
		console.error('设置超级编辑器内容失败:', error);
	}
}

// 获取超级编辑器内容
function getSuperEditorContent(elementId) {
	try {
		const editor = superEditorInstances[elementId];
		if (editor) {
			return editor.getData();
		}
		return '';
	} catch (error) {
		console.error('获取超级编辑器内容失败:', error);
		return '';
	}
}

// 清空超级编辑器内容
function clearSuperEditorContent(elementId) {
	try {
		const editor = superEditorInstances[elementId];
		if (editor) {
			editor.setData('');
			console.log(`清空超级编辑器 ${elementId} 内容`);
		}
	} catch (error) {
		console.error('清空超级编辑器内容失败:', error);
	}
}

// 销毁超级编辑器
async function destroySuperEditor(elementId) {
	try {
		const editor = superEditorInstances[elementId];
		if (editor) {
			await editor.destroy();
			editor._destroyed = true; // 标记为已销毁
			delete superEditorInstances[elementId];
			console.log(`超级编辑器 ${elementId} 已销毁`);
		}
	} catch (error) {
		console.error('销毁超级编辑器失败:', error);
	}
}

// 导出函数供其他脚本使用
window.CKEditorSuperHelper = {
	initEditor: initSuperEditor,
	setContent: setSuperEditorContent,
	getContent: getSuperEditorContent,
	clearContent: clearSuperEditorContent,
	destroyEditor: destroySuperEditor,
	editorInstances: superEditorInstances,
	editorConfig: editorConfig,
	// 新增：批量设置内容，减少DOM操作次数
	batchSetContent: function(updates) {
		Object.entries(updates).forEach(([elementId, content]) => {
			const editor = superEditorInstances[elementId];
			if (editor && !editor._destroyed) {
				editor.setData(content || '');
			}
		});
	}
};

// 如果页面有 #editor 元素，自动初始化（用于测试）
if (document.querySelector('#editor')) {
	ClassicEditor.create(document.querySelector('#editor'), editorConfig);
}