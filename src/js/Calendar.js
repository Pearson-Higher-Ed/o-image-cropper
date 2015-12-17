import * as React from 'react'
import * as ReactDom from 'react-dom'

export default class Calendar extends React.Component {

	constructor(props) {
		console.log("***********Calendar Constructor**************")
		super(props)
		this.state = {
			days:['S','M','T','W','T','F','S'],
			monthHeader:"October"
		}
	}

buttonHandler(){
	console.log("hi")
}

	render(){

		return(
			<table>
				<thead>
					<tr>
						<th>{this.state.monthHeader}</th>
						<th>
							<div id='buttonWrapper'>
								<div id='leftButton' onClick={this.props.buttonHandler}>-</div>
								<div id='centerButton'>today</div>
								<div id='rightButton'>+</div>
							</div>
						</th>
					</tr>
					<tr>
						<th> {this.state.days}</th>
					</tr>
				</thead>
				<tbody>
					<tr key={`key${0}`}></tr>
				</tbody>
			</table>
		)
	}


}

ReactDom.render(<Calendar />, document.getElementById('mount'))
