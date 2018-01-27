import task = require('vsts-task-lib/task');
import { AzureMysqlManagementClient } from 'azure-arm-rest/azure-arm-mysql';
import { AzureMysqlTaskParameter } from '../models/AzureMysqlTaskParameter';
import { ApplicationTokenCredentials} from 'azure-arm-rest/azure-arm-common';
import { MysqlServer } from '../models/MysqlServer';
import Q = require('q');

export class MysqlServerOperations{

    private _azureMysqManagementClient: AzureMysqlManagementClient;

    constructor(azureCredentials: ApplicationTokenCredentials, subscriptionId: string) {
        this._azureMysqManagementClient = new AzureMysqlManagementClient(azureCredentials, subscriptionId);
    }

    /**
     * Get mysql server data from server name including resource group
     * @param serverName     mysql server name to get details
     * 
     * @returns              mysql server details
     */
    public async getMysqlServerFromServerName(serverName: string): Promise<MysqlServer> {
        let defer = Q.defer<MysqlServer>();
        this._azureMysqManagementClient.mysqlServers.list((error, result, request, response) => {
            if(error){
                task.debug("Error during fetching mysql severs list: "+ error);
                defer.reject(new Error(task.loc("NotAbleToGetAllServers", error)));
            }else{
                try{
                    const mysqlServer = this._getMysqlServerFromResponse(result, serverName);
                    defer.resolve(mysqlServer);
                }
                catch(error){
                    defer.reject(error);   
                } 
            }
        });
        return defer.promise;
    }

    /**
     * Filter mysqlServer data from list of mysql server in particular subscription
     * @param result      List of mysql server in a subscription
     * @param serverName  server name
     * 
     * @returns           MysqlServer data
     */
    private _getMysqlServerFromResponse(result: any, serverName: string) : MysqlServer{
        let mysqlServer: MysqlServer;
        if(result && result.length > 0){
            result.forEach((resultObject) => {
                if(resultObject && resultObject.name === serverName){
                    const pathArray =resultObject.id.split("/");
                    mysqlServer = new MysqlServer(resultObject.name, resultObject.properties.fullyQualifiedDomainName, this._getResourceGroupNameFromUrl(resultObject.id));
                }
            });
        }else{
            task.debug("Mysql server list is empty or null.");
            throw new Error(task.loc("EmptyOrNullServerList"));
        }
        return mysqlServer;
    }

    /**
     * Get resource group name from mysql server url i.e Id
     */
    private _getResourceGroupNameFromUrl(id: string): string{
        if(!id){
            throw new Error(task.loc("UnableToFindResourceGroupDueToNullId"));
        }
        const pathArray =id.split("/");
        return pathArray[4];
    }

}