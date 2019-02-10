import React from 'react'
import Grid from '@material-ui/core/Grid'
import Typography from '@material-ui/core/Typography'
import { Query } from 'react-apollo'
import gql from 'graphql-tag'
import Card from '../view/Card'
import Loading from '../view/Loading'
import Layout from '../layout/Layout'

const RECENTEVENTSQUERY = gql`
    {
        recentEvents {
            name
            _id
            courses(onlyFirst: true) {
                mapPath
            }
        }
    }
`

export default () => 
    <Layout>
        <Query query={RECENTEVENTSQUERY}>
            {({loading, error, data}) => {
                if(loading)
                    return <Loading />
                if(error)
                    return 'error'
                const { recentEvents } = data
                return (
                    <>
                        <Typography variant='h5'>Recent events</Typography>
                        <Grid container spacing={16}>
                            {recentEvents.map(event => {
                                const path = event.courses[0].mapPath
                                const thumbPath = path.slice(0, 7) + 'thumb_' + path.slice(7)
                                return <Grid item xs={12} sm={6} md={4} lg={3} key={event._id}>
                                    <Card
                                        redirectTo={`/event/${event._id}`}
                                        image={'/api/' + thumbPath}
                                        name={event.name}
                                    />
                                </Grid>
                            })}
                        </Grid>
                    </>
                )
            }}
        </Query>
    </Layout>
