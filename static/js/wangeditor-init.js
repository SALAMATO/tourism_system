/**
 * wangEditor 5 富文本编辑器初始化工具
 * 用于替换 CKEditor，提供完全免费的富文本编辑功能
 * 官方网站: https://www.wangeditor.com/
 */

// wangEditor 实例存储 { editorId: { editor, toolbar } }
const wangEditorInstances = {};

// wangEditor 默认配置
const defaultWangEditorConfig = {
    placeholder: '请输入内容...',
    mode: 'default', // 'default' 或 'simple'
    onChange(editor) {
        // 内容变化时的回调
        const html = editor.getHtml();
        // 同步到隐藏的 textarea
        const textarea = document.getElementById(editor.id);
        if (textarea) {
            textarea.value = html;
        }
    }
};

// 工具栏默认配置
const defaultToolbarConfig = {
    // 可以在这里自定义工具栏菜单
    // excludeKeys: [] // 排除某些菜单
};

/**
 * 初始化 wangEditor 编辑器
 * @param {string} elementId - textarea 元素的 ID
 * @param {object} customConfig - 自定义配置（可选）
 * @returns {Promise} - 返回 { editor, toolbar } 对象
 */
async function initWangEditor(elementId, customConfig = {}) {
    try {
        // 检查 wangEditor 是否已加载
        if (typeof window.wangEditor === 'undefined') {
            console.error('wangEditor 库未加载！请检查 CDN 链接是否正确');
            throw new Error('wangEditor 库加载失败，请刷新页面重试');
        }

        const { createEditor, createToolbar } = window.wangEditor;
        
        const textarea = document.getElementById(elementId);
        if (!textarea) {
            console.warn(`元素 ${elementId} 不存在`);
            return null;
        }

        // 如果已经初始化过，先销毁旧实例
        if (wangEditorInstances[elementId]) {
            await destroyWangEditor(elementId);
        }

        // 合并配置
        const finalConfig = {
            ...defaultWangEditorConfig,
            ...customConfig,
            onChange(editor) {
                const html = editor.getHtml();
                const textarea = document.getElementById(editor.id);
                if (textarea) {
                    textarea.value = html;
                }
                // 调用用户自定义的 onChange
                if (customConfig.onChange) {
                    customConfig.onChange(editor);
                }
            }
        };

        console.log(`正在初始化 wangEditor: ${elementId}`);

        // 创建编辑器容器结构
        const wrapper = document.createElement('div');
        wrapper.id = `${elementId}-wrapper`;
        wrapper.style.border = '1px solid #ccc';
        wrapper.style.zIndex = '100';
        
        const toolbarContainer = document.createElement('div');
        toolbarContainer.id = `${elementId}-toolbar-container`;
        toolbarContainer.style.borderBottom = '1px solid #ccc';
        
        const editorContainer = document.createElement('div');
        editorContainer.id = `${elementId}-editor-container`;
        editorContainer.style.height = '400px';
        
        wrapper.appendChild(toolbarContainer);
        wrapper.appendChild(editorContainer);
        
        // 将 wrapper 插入到 textarea 之前
        textarea.parentNode.insertBefore(wrapper, textarea);
        
        // 隐藏原始 textarea
        textarea.classList.add('wang-hidden');

        // 创建编辑器
        const editorConfig = {
            placeholder: finalConfig.placeholder,
            onChange: finalConfig.onChange
        };

        const editor = createEditor({
            selector: `#${elementId}-editor-container`,
            id: elementId, // 设置编辑器 ID
            html: textarea.value || '<p><br></p>',
            config: editorConfig,
            mode: finalConfig.mode
        });

        // 创建工具栏
        const toolbar = createToolbar({
            editor,
            selector: `#${elementId}-toolbar-container`,
            config: defaultToolbarConfig,
            mode: finalConfig.mode
        });

        // 存储实例
        wangEditorInstances[elementId] = { editor, toolbar };

        console.log(`wangEditor ${elementId} 初始化成功`);
        return { editor, toolbar };
    } catch (error) {
        console.error(`初始化 wangEditor ${elementId} 失败:`, error);
        return null;
    }
}

/**
 * 设置 wangEditor 内容
 * @param {string} elementId - 编辑器 ID
 * @param {string} content - HTML 内容
 */
function setWangEditorContent(elementId, content) {
    try {
        const instance = wangEditorInstances[elementId];
        if (instance && instance.editor) {
            instance.editor.setHtml(content || '');
            console.log(`设置 wangEditor ${elementId} 内容成功`);
        } else {
            console.warn(`wangEditor ${elementId} 未初始化`);
        }
    } catch (error) {
        console.error('设置 wangEditor 内容失败:', error);
    }
}

/**
 * 获取 wangEditor 内容
 * @param {string} elementId - 编辑器 ID
 * @returns {string} - HTML 内容
 */
function getWangEditorContent(elementId) {
    try {
        const instance = wangEditorInstances[elementId];
        if (instance && instance.editor) {
            return instance.editor.getHtml();
        }
        return '';
    } catch (error) {
        console.error('获取 wangEditor 内容失败:', error);
        return '';
    }
}

/**
 * 清空 wangEditor 内容
 * @param {string} elementId - 编辑器 ID
 */
function clearWangEditorContent(elementId) {
    try {
        const instance = wangEditorInstances[elementId];
        if (instance && instance.editor) {
            instance.editor.setHtml('');
            console.log(`清空 wangEditor ${elementId} 内容`);
        }
    } catch (error) {
        console.error('清空 wangEditor 内容失败:', error);
    }
}

/**
 * 销毁 wangEditor 实例
 * @param {string} elementId - 编辑器 ID
 */
async function destroyWangEditor(elementId) {
    try {
        const instance = wangEditorInstances[elementId];
        if (instance) {
            // 销毁编辑器和工具栏
            if (instance.editor) {
                instance.editor.destroy();
            }
            if (instance.toolbar) {
                instance.toolbar.destroy();
            }
            
            delete wangEditorInstances[elementId];
            
            // 移除 wrapper 容器
            const wrapper = document.getElementById(`${elementId}-wrapper`);
            if (wrapper) {
                wrapper.remove();
            }
            
            // 显示原始 textarea
            const textarea = document.getElementById(elementId);
            if (textarea) {
                textarea.classList.remove('wang-hidden');
            }
            
            console.log(`wangEditor ${elementId} 已销毁`);
        }
    } catch (error) {
        console.error('销毁 wangEditor 失败:', error);
    }
}

/**
 * 批量设置多个编辑器内容
 * @param {object} updates - { elementId: content }
 */
function batchSetWangEditorContent(updates) {
    Object.entries(updates).forEach(([elementId, content]) => {
        setWangEditorContent(elementId, content);
    });
}

// 导出函数供其他脚本使用
window.WangEditorHelper = {
    initEditor: initWangEditor,
    setContent: setWangEditorContent,
    getContent: getWangEditorContent,
    clearContent: clearWangEditorContent,
    destroyEditor: destroyWangEditor,
    editorInstances: wangEditorInstances,
    batchSetContent: batchSetWangEditorContent
};

console.log('wangEditor Helper 已加载');
