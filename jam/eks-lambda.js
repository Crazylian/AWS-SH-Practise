import { EKSClient, DeleteAccessEntryCommand, ListAssociatedAccessPoliciesCommand, CreateAccessEntryCommand } from "@aws-sdk/client-eks";
import { IAMClient, UpdateAssumeRolePolicyCommand } from "@aws-sdk/client-iam";
const client = new EKSClient(process.config);
const iamClient = new IAMClient(process.config);
export const handler = async (event, context) => {
    console.log("Received event", event);
    console.log("Request Body values: ", event['requestBody']['content']['application/json']['properties']);
    // Extract the action group, api path, and parameters from the prediction
    var action = event["actionGroup"];
    var api_path = event["apiPath"];
    var httpMethod = event["httpMethod"];
    var response_body, response_code, body, command, res, reason;
    var clusterName, principalArn;
    var roleArn;
    if (api_path == '/createAccessEntry') {
        try {
            var array = event['requestBody']['content']['application/json']['properties'];
            array.forEach((element) => {
                if (element['name'] == 'clusterName')
                    clusterName = element['value'];
                else if (element['name'] == 'principalArn')
                    principalArn = element['value'];
            });
            // ************************************************* //
            // ************** Create Access Entry **************  //
            // ************************************************* //
            var input = {
                clusterName: clusterName,
                principalArn: principalArn,
            };
            const command = new CreateAccessEntryCommand(input);
            const response = await client.send(command);

            body = { accessEntryArn: "Fix the code to create access entry", accessPolicy: "No access policy attached" };
            response_code = 200;
            response_body = { "application/json": { "body": JSON.stringify(response) } };
        }
        catch (error) {
            if (error instanceof Error) {
                reason = error.message + "API Call - ${api_path}";
            }
            else
                reason = "error occurred in API call ${api_path}";
            body = { error: reason };
            response_code = 400;
            response_body = { "application/json": { "body": JSON.stringify(body) } };
        }
    }
    else if (api_path == '/describeAccessEntry') {
        try {
            var array = event['requestBody']['content']['application/json']['properties'];
            array.forEach((element) => {
                if (element['name'] == 'clusterName')
                    clusterName = element['value'];
                else if (element['name'] == 'principalArn')
                    principalArn = element['value'];
            });
            // Describe Access Entry's attached Access policies
            var input2 = {
                clusterName: clusterName,
                principalArn: principalArn
            };
            command = new ListAssociatedAccessPoliciesCommand(input2);
            res = await client.send(command);
            const ans = res['associatedAccessPolicies'];
            if (ans != undefined) {
                const newArray = ans.map(obj => {
                    const newObj = { ...obj };
                    delete newObj['associatedAt'];
                    delete newObj['modifiedAt'];
                    return newObj;
                });
                body = newArray;
                response_code = 200;
                response_body = { "application/json": { "body": JSON.stringify(body) } };
            }
        }
        catch (error) {
            if (error instanceof Error) {
                reason = error.message + "API Call - ${api_path}";
            }
            else
                reason = "error occurred in API call ${api_path}";
            body = { error: reason };
            response_code = 400;
            response_body = { "application/json": { "body": JSON.stringify(body) } };
        }
    }
    else if (api_path == '/deleteAccessEntry') {
        try {
            var array = event['requestBody']['content']['application/json']['properties'];
            array.forEach((element) => {
                if (element['name'] == 'clusterName')
                    clusterName = element['value'];
                else if (element['name'] == 'principalArn')
                    principalArn = element['value'];
            });
            // Delete Access Entry from the EKS Cluster
            var input3 = {
                clusterName: clusterName,
                principalArn: principalArn
            };
            command = new DeleteAccessEntryCommand(input3);
            res = await client.send(command);
            response_code = 200;
            response_body = { "application/json": { "body": "Successfully deleted the access entry" } };
        }
        catch (error) {
            if (error instanceof Error) {
                reason = error.message + "API Call - ${api_path}";
            }
            else
                reason = "error occurred in API call ${api_path}";
            body = { error: reason };
            response_code = 400;
            response_body = { "application/json": { "body": JSON.stringify(body) } };
        }
    }
    else if (api_path == '/updateRolePodIdentity') {
        try {
            var array = event['requestBody']['content']['application/json']['properties'];
            array.forEach((element) => {
                if (element['name'] == 'roleArn')
                    roleArn = element['value'];
            });
            var roleName = roleArn.split('/')[1];
            // ********************************************************************* //
            // ************** Update IAM role's assume role policy ************** //
            // ********************************************************************* //
            const input = { // UpdateAssumeRolePolicyRequest
            RoleName: roleName, // required
            PolicyDocument: `{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "AllowEksAuthToAssumeRoleForPodIdentity",
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "pods.eks.amazonaws.com"
                        },
                        "Action": [
                            "sts:AssumeRole",
                            "sts:TagSession"
                        ]
                    }
                ]
            }` // required
            };
            const command = new UpdateAssumeRolePolicyCommand(input);
            const response = await iamClient.send(command);

            body = { roleArn: "Fix the code to update the role" };
            response_code = 200;
            response_body = { "application/json": { "body": JSON.stringify(response) } };
        }
        catch (error) {
            if (error instanceof Error) {
                reason = error.message + "API Call - ${api_path}";
            }
            else
                reason = "error occurred in API call ${api_path}";
            body = { error: reason };
            response_code = 400;
            response_body = { "application/json": { "body": JSON.stringify(body) } };
        }
    }
    else {
        body = { error: "Incorrect API Path. Try another way" };
        response_code = 400;
        response_body = { "application/json": { "body": JSON.stringify(body) } };
    }
    var action_response = {
        'actionGroup': action,
        'apiPath': api_path,
        'httpMethod': httpMethod,
        'httpStatusCode': response_code,
        'responseBody': response_body
    };
    var session_attributes = event['sessionAttributes'];
    var prompt_session_attributes = event['promptSessionAttributes'];
    var api_response = {
        'messageVersion': '1.0',
        'response': action_response,
        'sessionAttributes': session_attributes,
        'promptSessionAttributes': prompt_session_attributes
    };
    return api_response;
};
