// API管理模块 - RESTful Table API调用

// js/api.js

class API {
  constructor() {
    // 开发环境：Django后端地址
    this.baseURL = 'http://127.0.0.1:8000/api/';

    // 生产环境配置
    // this.baseURL = window.location.origin + '/api/';
  }

  // 通用请求方法
  async request(url, options = {}) {
    try {
      // 基础头部（JSON）
      let headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      // 如全局存在 getAuthHeaders，则自动附加认证头（例如 Token）
      if (typeof getAuthHeaders === 'function') {
        headers = {
          ...headers,
          ...getAuthHeaders()
        };
      }

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // DELETE请求返回204无内容
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      console.error('API请求错误:', error);
      throw error;
    }
  }

  // Django REST Framework的列表接口格式
  async getTableData(tableName, params = {}) {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      page_size: params.limit || 100,
      ...(params.search && { search: params.search }),
      ...(params.sort && { ordering: params.sort })
    });

    const response = await this.request(`${this.baseURL}${tableName}/?${queryParams}`);

    // 转换Django分页格式到前端格式
    return {
      data: response.results || response,
      total: response.count || response.length,
      page: params.page || 1,
      limit: params.limit || 100
    };
  }

  // 获取单条记录
  async getRecord(tableName, recordId) {
    return await this.request(`${this.baseURL}${tableName}/${recordId}/`);
  }

  // 创建记录
  async createRecord(tableName, data) {
    // 移除前端生成的id，让后端自动生成
    const { id, ...submitData } = data;

    return await this.request(`${this.baseURL}${tableName}/`, {
      method: 'POST',
      body: JSON.stringify(submitData)
    });
  }

  // 更新记录（完整更新）
  async updateRecord(tableName, recordId, data) {
    return await this.request(`${this.baseURL}${tableName}/${recordId}/`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // 部分更新记录
  async patchRecord(tableName, recordId, data) {
    return await this.request(`${this.baseURL}${tableName}/${recordId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // 删除记录
  async deleteRecord(tableName, recordId) {
    return await this.request(`${this.baseURL}${tableName}/${recordId}/`, {
      method: 'DELETE'
    });
  }

  // === 具体业务API方法 ===

  // 政策法规相关
  async getPolicies(params = {}) {
    return await this.getTableData('policies', params);
  }

  async getPolicy(id) {
    return await this.getRecord('policies', id);
  }

  async createPolicy(data) {
    return await this.createRecord('policies', data);
  }

  async updatePolicy(id, data) {
    return await this.updateRecord('policies', id, data);
  }

  async deletePolicy(id) {
    return await this.deleteRecord('policies', id);
  }

  // 新闻资讯相关
  async getNews(params = {}) {
    return await this.getTableData('news', params);
  }

  async getNewsItem(id) {
    return await this.getRecord('news', id);
  }

  async createNews(data) {
    return await this.createRecord('news', data);
  }

  async updateNews(id, data) {
    return await this.updateRecord('news', id, data);
  }

  async deleteNews(id) {
    return await this.deleteRecord('news', id);
  }

  // 增加浏览次数（使用Django的自定义action）
  async incrementNewsViews(id, currentViews) {
    return await this.request(`${this.baseURL}news/${id}/increment_views/`, {
      method: 'POST'
    });
  }

  // 安全隐患相关
  async getSafetyAlerts(params = {}) {
    return await this.getTableData('safety-alerts', params);
  }

  async getSafetyAlert(id) {
    return await this.getRecord('safety-alerts', id);
  }

  async createSafetyAlert(data) {
    return await this.createRecord('safety-alerts', data);
  }

  async updateSafetyAlert(id, data) {
    return await this.updateRecord('safety-alerts', id, data);
  }

  async deleteSafetyAlert(id) {
    return await this.deleteRecord('safety-alerts', id);
  }

  // 留言反馈相关
  async getMessages(params = {}) {
    return await this.getTableData('messages', params);
  }

  async getMessage(id) {
    return await this.getRecord('messages', id);
  }

  async createMessage(data) {
    return await this.createRecord('messages', data);
  }

  async replyMessage(id, replyContent) {
    return await this.request(`${this.baseURL}messages/${id}/reply/`, {
      method: 'PATCH',
      body: JSON.stringify({ reply: replyContent })
    });
  }

  async deleteMessage(id) {
    return await this.deleteRecord('messages', id);
  }

  async updateMessage(id, data) {
    return await this.patchRecord('messages', id, data);
  }

  // 点赞留言
  async likeMessage(id) {
    return await this.request(`${this.baseURL}messages/${id}/like/`, {
      method: 'POST'
    });
  }

  // 取消点赞
  async unlikeMessage(id) {
    return await this.request(`${this.baseURL}messages/${id}/unlike/`, {
      method: 'POST'
    });
  }

  // 添加评论
  async addComment(messageId, content) {
    return await this.request(`${this.baseURL}messages/${messageId}/add_comment/`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  // 获取留言的评论
  async getMessageComments(messageId) {
    return await this.request(`${this.baseURL}messages/${messageId}/comments/`);
  }

  // 删除评论
  async deleteComment(commentId) {
    return await this.deleteRecord('message-comments', commentId);
  }

  // 统计数据相关
  async getStatistics(params = {}) {
    return await this.getTableData('statistics', params);
  }

  async getStatistic(id) {
    return await this.getRecord('statistics', id);
  }

  async createStatistic(data) {
    return await this.createRecord('statistics', data);
  }

  async updateStatistic(id, data) {
    return await this.updateRecord('statistics', id, data);
  }

  async deleteStatistic(id) {
    return await this.deleteRecord('statistics', id);
  }

  // 用户管理相关
  async getUsers(params = {}) {
    return await this.getTableData('user', params);
  }

  async getUser(id) {
    return await this.getRecord('user', id);
  }

  async updateUser(id, data) {
    return await this.patchRecord('user', id, data);
  }

  async deleteUser(id) {
    return await this.deleteRecord('user', id);
  }

  // 重置用户密码
  async resetUserPassword(id, newPassword) {
    return await this.request(`${this.baseURL}user/${id}/reset_password/`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword })
    });
  }

  // 获取用户的留言
  async getUserMessages(userId, params = {}) {
    const queryParams = new URLSearchParams({
      user_id: userId,
      page: params.page || 1,
      page_size: params.limit || 100,
      ...(params.sort && { ordering: params.sort })
    });
    return await this.getTableData('messages', { ...params, search: queryParams.get('user_id') });
  }
}

// 创建全局API实例
const api = new API();


