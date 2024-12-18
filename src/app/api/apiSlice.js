import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { setCredentials } from '../../features/auth/authSlice'

const baseQuery = fetchBaseQuery({
    baseUrl: 'https://technotes-api-gpxr.onrender.com',
    credentials: 'include',  
    prepareHeaders: (headers, { getState }) => {     // adds a header to each request to the API (getState comes from api object)
        const token = getState().auth.token     // get current state . auth slice of the state . token (access token)

        if (token) {
            headers.set("authorization", `Bearer ${token}`)
        }
        return headers
    }
})

const baseQueryWithReauth = async (args, api, extraOptions) => {    // base query with Re-authentication
    // console.log(args) // request url, method, body
    // console.log(api) // signal, dispatch, getState()
    // console.log(extraOptions) //custom like {shout: true}

    let result = await baseQuery(args, api, extraOptions)        // might succeed if access token hasn't expired

    
    if (result?.error?.status === 403) {    // access token expired
        console.log('sending refresh token')    

        // send refresh token to get new access token 
        const refreshResult = await baseQuery('/auth/refresh', api, extraOptions)

        if (refreshResult?.data) {      // if refresh token is still valid, send a new access token
            // store the new token 
            api.dispatch(setCredentials({ ...refreshResult.data }))  

            // retry original query with new access token
            result = await baseQuery(args, api, extraOptions)   
        } else {        // refresh token expired
            if (refreshResult?.error?.status === 403) {     // refresh token ALSO expired -- user now needs to log in again
                refreshResult.error.data.message = "Your login has expired."
            }
            return refreshResult
        }
    }

    return result
}

export const apiSlice = createApi({
    baseQuery: baseQueryWithReauth,
    tagTypes: ['Note', 'User'],
    endpoints: builder => ({})
})