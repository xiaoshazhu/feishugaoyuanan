import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * 飞书开放平台集成服务类，提供租户访问令牌获取及多维表格接口封装
 */
@Injectable()
export class FeishuService {
  private readonly logger = new Logger(FeishuService.name);
  private token: string | null = null;
  private tokenExpiryTime = 0;

  /**
   * 功能描述：向飞书开放平台获取企业自建应用的 tenant_access_token。如果缓存未过期则直接返回缓存令牌。
   * @param forceRefresh {boolean} 是否强制刷新令牌 (选填，默认 false)
   * @return {Promise<string>} 返回当前可用的 tenant_access_token，如果获取失败将抛出错误
   */
  async getTenantAccessToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && this.token && now < this.tokenExpiryTime) {
      return this.token;
    }

    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      const msg = '未配置 FEISHU_APP_ID 或 FEISHU_APP_SECRET 环境变量';
      this.logger.error(msg);
      throw new Error(msg);
    }

    try {
      this.logger.log('正在向飞书开放平台申请租户访问令牌...');
      const response = await axios.post(
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
        {
          app_id: appId,
          app_secret: appSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        },
      );

      if (response.data?.code === 0) {
        this.token = response.data.tenant_access_token;
        // 提前 5 分钟（300秒）过期，确保安全余量
        const expireInSeconds = response.data.expire || 7200;
        this.tokenExpiryTime = now + (expireInSeconds - 300) * 1000;
        this.logger.log('成功获取飞书 tenant_access_token 并存入缓存');
        return this.token!;
      } else {
        const errorMsg = `获取令牌失败: ${response.data?.msg || '未知错误'} (错误码: ${response.data?.code})`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      this.logger.error('获取飞书 tenant_access_token 时发生异常', error.stack);
      throw error;
    }
  }

  /**
   * 功能描述：列出指定多维表格（Bitable）数据表中的记录
   * @param appToken {string} 多维表格的唯一标识 token (必填)
   * @param tableId {string} 数据表 ID (必填)
   * @param pageSize {number} 分页大小，最大值为 100 (选填)
   * @return {Promise<any[]>} 返回记录项列表，如果为空或出错返回空数组
   */
  async getRecords(appToken: string, tableId: string, pageSize = 100): Promise<any[]> {
    try {
      const token = await this.getTenantAccessToken();
      const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
      
      this.logger.log(`拉取多维表格数据: appToken=${appToken}, tableId=${tableId}`);
      const response = await axios.get(url, {
        params: { page_size: pageSize },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data?.code === 0) {
        return response.data.data?.items || [];
      } else {
        this.logger.warn(`多维表格接口返回错误: ${response.data?.msg || '未知错误'} (码: ${response.data?.code})`);
        return [];
      }
    } catch (error) {
      this.logger.error(`读取多维表格记录失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 功能描述：获取单条多维表格（Bitable）数据表中的记录
   * @param appToken {string} 多维表格唯一标识 token
   * @param tableId {string} 数据表 ID
   * @param recordId {string} 记录 ID
   * @return {Promise<any>} 包含记录信息的对象，失败返回 null
   */
  async getRecord(appToken: string, tableId: string, recordId: string): Promise<any> {
    try {
      const token = await this.getTenantAccessToken();
      const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`;
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data?.code === 0) {
        return response.data.data?.record || null;
      } else {
        this.logger.warn(`读取单条记录错误: ${response.data?.msg || '未知错误'} (码: ${response.data?.code})`);
        return null;
      }
    } catch (error) {
      this.logger.error(`读取单条多维表格记录失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 功能描述：向多维表格中新增一条记录
   * @param appToken {string} 多维表格唯一标识 token (必填)
   * @param tableId {string} 数据表 ID (必填)
   * @param fields {any} 新记录的字段键值对 (必填)
   * @return {Promise<any>} 返回包含新增记录信息的对象，若失败返回 null
   */
  async createRecord(appToken: string, tableId: string, fields: any): Promise<any> {
    try {
      const token = await this.getTenantAccessToken();
      const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;

      const response = await axios.post(
        url,
        { fields },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        },
      );

      if (response.data?.code === 0) {
        return response.data.data?.record;
      } else {
        this.logger.error(`新增多维表格记录失败: ${response.data?.msg || '未知'} (码: ${response.data?.code})`);
        return null;
      }
    } catch (error) {
      this.logger.error(`新增多维表格记录异常: ${error.message}`);
      return null;
    }
  }

  /**
   * 功能描述：更新多维表格中指定记录的值
   * @param appToken {string} 多维表格唯一标识 token (必填)
   * @param tableId {string} 数据表 ID (必填)
   * @param recordId {string} 要更新的记录 ID (必填)
   * @param fields {any} 需要更新的字段键值对 (必填)
   * @return {Promise<any>} 返回更新后的记录字段，失败返回 null
   */
  async updateRecord(appToken: string, tableId: string, recordId: string, fields: any): Promise<any> {
    try {
      const token = await this.getTenantAccessToken();
      const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`;

      const response = await axios.put(
        url,
        { fields },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        },
      );

      if (response.data?.code === 0) {
        return response.data.data?.record;
      } else {
        this.logger.error(`更新多维表格记录失败: ${response.data?.msg || '未知'} (码: ${response.data?.code})`);
        return null;
      }
    } catch (error) {
      this.logger.error(`更新多维表格记录异常: ${error.message}`);
      return null;
    }
  }
}
