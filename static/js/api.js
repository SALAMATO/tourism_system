// API管理模块 - RESTful Table API调用

class API {
  constructor() {
    this.baseURL = 'http://127.0.0.1:8000/api/';
  }

  async request(url, options = {}) {
    try {
      const isFormData = options.body instanceof FormData;
      let headers = {
        ...(options.headers || {})
      };

      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      if (typeof getAuthHeaders === 'function') {
        headers = {
          ...headers,
          ...getAuthHeaders()
        };
      }

      if (isFormData && headers['Content-Type']) {
        delete headers['Content-Type'];
      }

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && typeof errorData === 'object') {
            const flattened = Object.entries(errorData)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join('、') : value}`)
              .join(' | ');
            if (flattened) {
              errorMessage = flattened;
            }
          }
        } catch (parseError) {
        }
        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      console.error('API请求错误:', error);
      throw error;
    }
  }

  async getTableData(tableName, params = {}) {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      page_size: params.limit || 100,
      ...(params.search && { search: params.search }),
      ...(params.sort && { ordering: params.sort }),
      ...(params.city && { city: params.city }),
      ...(params.recommendation_type && { recommendation_type: params.recommendation_type }),
      ...(params.is_featured !== undefined && { is_featured: params.is_featured }),
      ...(params.is_hot !== undefined && { is_hot: params.is_hot })
    });

    const response = await this.request(`${this.baseURL}${tableName}/?${queryParams}`);

    return {
      data: response.results || response,
      total: response.count || response.length,
      page: params.page || 1,
      limit: params.limit || 100
    };
  }

  async getRecord(tableName, recordId) {
    return await this.request(`${this.baseURL}${tableName}/${recordId}/`);
  }

  async createRecord(tableName, data) {
    if (data instanceof FormData) {
      return await this.request(`${this.baseURL}${tableName}/`, {
        method: 'POST',
        body: data
      });
    }

    const { id, ...submitData } = data;
    return await this.request(`${this.baseURL}${tableName}/`, {
      method: 'POST',
      body: JSON.stringify(submitData)
    });
  }

  async updateRecord(tableName, recordId, data) {
    const isFormData = data instanceof FormData;
    return await this.request(`${this.baseURL}${tableName}/${recordId}/`, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  async patchRecord(tableName, recordId, data) {
    const isFormData = data instanceof FormData;
    return await this.request(`${this.baseURL}${tableName}/${recordId}/`, {
      method: 'PATCH',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  async deleteRecord(tableName, recordId) {
    return await this.request(`${this.baseURL}${tableName}/${recordId}/`, {
      method: 'DELETE'
    });
  }

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

  async incrementNewsViews(id) {
    return await this.request(`${this.baseURL}news/${id}/increment_views/`, {
      method: 'POST'
    });
  }

  async getDestinations(params = {}) {
    return await this.getTableData('destinations', params);
  }

  async getDestination(id) {
    return await this.getRecord('destinations', id);
  }

  async createDestination(data) {
    return await this.createRecord('destinations', data);
  }

  async updateDestination(id, data) {
    return await this.updateRecord('destinations', id, data);
  }

  async deleteDestination(id) {
    return await this.deleteRecord('destinations', id);
  }

  async incrementDestinationViews(id) {
    return await this.request(`${this.baseURL}destinations/${id}/increment_views/`, {
      method: 'POST'
    });
  }

  async getDestinationCities(params = {}) {
    const query = new URLSearchParams({
      ...(params.recommendation_type && { recommendation_type: params.recommendation_type })
    });
    return await this.request(`${this.baseURL}destinations/cities/?${query}`);
  }

  async getHomepageDestinationModules(params = {}) {
    const query = new URLSearchParams({
      ...(params.nearby_city && { nearby_city: params.nearby_city }),
      ...(params.managed_city && { managed_city: params.managed_city })
    });
    return await this.request(`${this.baseURL}destinations/homepage_modules/?${query}`);
  }

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

  async likeMessage(id) {
    return await this.request(`${this.baseURL}messages/${id}/like/`, {
      method: 'POST'
    });
  }

  async unlikeMessage(id) {
    return await this.request(`${this.baseURL}messages/${id}/unlike/`, {
      method: 'POST'
    });
  }

  async addComment(messageId, content) {
    return await this.request(`${this.baseURL}messages/${messageId}/add_comment/`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async getMessageComments(messageId) {
    return await this.request(`${this.baseURL}messages/${messageId}/comments/`);
  }

  async deleteComment(commentId) {
    return await this.deleteRecord('message-comments', commentId);
  }

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

  async resetUserPassword(id, newPassword) {
    return await this.request(`${this.baseURL}user/${id}/reset_password/`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword })
    });
  }

  async getUserMessages(userId, params = {}) {
    const queryParams = new URLSearchParams({
      user_id: userId,
      page: params.page || 1,
      page_size: params.limit || 100,
      ...(params.sort && { ordering: params.sort })
    });
    return await this.getTableData('messages', { ...params, search: queryParams.get('user_id') });
  }

  async fetchPolicyFromUrl(url) {
    return await this.request(`${this.baseURL}policies/fetch_from_url/`, {
      method: 'POST',
      body: JSON.stringify({ url })
    });
  }

  async fetchNewsFromUrl(url) {
    return await this.request(`${this.baseURL}news/fetch_from_url/`, {
      method: 'POST',
      body: JSON.stringify({ url })
    });
  }
}

const api = new API();
