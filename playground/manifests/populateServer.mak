SERVER ?= http://localhost:8080/hapi/fhir/

Resources = \
  Patient/smoker-1 \
  Observation/smoker-1-smoking-2022-05-19 \
  Observation/smoker-1-smoking-2023-06-20

# emit this:
# curl -X PUT -H "'Content-Type: application/json'" --data @Observation/smoker-1-smoking-2023-06-20.json ${SERVER}Observation/smoker-1-smoking-2023-06-20
# . pipe it to a shell

all:
	@- $(foreach Resource,$(Resources), \
	  \
	  echo curl -X PUT -H "'Content-Type: application/json'" --data @${Resource}.json ${SERVER}${Resource} ; \
	)
